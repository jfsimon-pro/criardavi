import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    ConnectionState,
    WASocket,
    WAMessage,
    proto,
    downloadMediaMessage,
    getContentType
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import P from 'pino';
import QRCode from 'qrcode';
import { prisma } from './prisma';
import { 
    grantNumberAccess, 
    logActivity, 
    recordChatParticipation, 
    updateUserStats 
} from './permissions';
import { generateAIResponse, markChatForHandoff, transcribeAudio } from './openai';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

const logger = P({ level: 'silent' }); // Silent logger for production

// Media upload directory
const MEDIA_DIR = path.join(process.cwd(), 'public', 'uploads', 'media');

// Ensure media directory exists
if (!fs.existsSync(MEDIA_DIR)) {
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

// Types for managing multiple connections
interface ConnectionInstance {
    sock: WASocket | null;
    qrCodeData: string | null;
    connectionStatus: 'disconnected' | 'connecting' | 'connected';
    qrCodeTimeout: NodeJS.Timeout | null;
    connectionTimeout: NodeJS.Timeout | null;
    connectionId: number; // Database ID - now required (created before connection)
    userId: number; // Who owns this connection
    phoneNumber: string | null;
}

// Map to store multiple simultaneous connections (key = connectionId from database)
const connections = new Map<number, ConnectionInstance>();

// Debounce system for AI responses - prevents responding to each message separately
// Key format: `${connectionId}:${chatId}`
const aiResponseDebounce = new Map<string, NodeJS.Timeout>();
const AI_RESPONSE_DELAY = 10000; // 10 seconds wait before responding

/**
 * Get or create a connection instance for a specific connectionId
 */
function getConnectionInstance(connectionId: number, userId: number): ConnectionInstance {
    if (!connections.has(connectionId)) {
        connections.set(connectionId, {
            sock: null,
            qrCodeData: null,
            connectionStatus: 'disconnected',
            qrCodeTimeout: null,
            connectionTimeout: null,
            connectionId,
            userId,
            phoneNumber: null
        });
    }
    return connections.get(connectionId)!;
}

/**
 * Get existing connection instance by connectionId
 */
function getExistingConnectionInstance(connectionId: number): ConnectionInstance | null {
    return connections.get(connectionId) || null;
}

/**
 * Helper function to save or update a chat in the database
 */
async function saveOrUpdateChat(chatId: string, connectionId: number, message?: WAMessage) {
    const isGroup = chatId.includes('@g.us');
    const contactNumber = chatId.replace('@s.whatsapp.net', '').replace('@g.us', '');
    
    // Get contact name from message or use number as fallback
    const contactName = message?.pushName || contactNumber;
    
    const lastMessageText = message?.message?.conversation || 
                           message?.message?.extendedTextMessage?.text ||
                           message?.message?.imageMessage?.caption ||
                           '[Mídia]';
    
    // Upsert chat
    await prisma.chat.upsert({
        where: { id: chatId },
        update: {
            lastMessageAt: message ? new Date(Number(message.messageTimestamp) * 1000) : new Date(),
            lastMessagePreview: lastMessageText?.substring(0, 100) || null,
            totalMessages: { increment: 1 },
            unreadCount: message && !message.key.fromMe ? { increment: 1 } : undefined,
        },
        create: {
            id: chatId,
            connectionId,
            contactName,
            contactNumber,
            isGroup,
            lastMessageAt: message ? new Date(Number(message.messageTimestamp) * 1000) : new Date(),
            lastMessagePreview: lastMessageText?.substring(0, 100) || null,
            totalMessages: 1,
            unreadCount: message && !message.key.fromMe ? 1 : 0,
        }
    });
}

/**
 * Download and save media from a message
 */
async function downloadAndSaveMedia(msg: WAMessage, sock: WASocket): Promise<{ url: string; mimeType: string } | null> {
    try {
        if (!msg.message) return null;
        
        const mediaMessage = msg.message.imageMessage || 
                            msg.message.videoMessage || 
                            msg.message.audioMessage || 
                            msg.message.documentMessage ||
                            msg.message.stickerMessage;
        
        if (!mediaMessage) return null;
        
        // Download media buffer
        const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            {
                logger,
                reuploadRequest: sock.updateMediaMessage
            }
        );
        
        if (!buffer) return null;
        
        // Determine file extension
        const mimeType = mediaMessage.mimetype || 'application/octet-stream';
        let extension = '.bin';
        
        if (mimeType.includes('image/jpeg') || mimeType.includes('image/jpg')) extension = '.jpg';
        else if (mimeType.includes('image/png')) extension = '.png';
        else if (mimeType.includes('image/gif')) extension = '.gif';
        else if (mimeType.includes('image/webp')) extension = '.webp';
        else if (mimeType.includes('video/mp4')) extension = '.mp4';
        else if (mimeType.includes('video/')) extension = '.mp4';
        else if (mimeType.includes('audio/ogg')) extension = '.ogg';
        else if (mimeType.includes('audio/mpeg')) extension = '.mp3';
        else if (mimeType.includes('audio/')) extension = '.ogg';
        else if (mimeType.includes('application/pdf')) extension = '.pdf';
        else if (msg.message.documentMessage?.fileName) {
            const originalExt = path.extname(msg.message.documentMessage.fileName);
            if (originalExt) extension = originalExt;
        }
        
        // Generate unique filename
        const filename = `${randomUUID()}${extension}`;
        const filepath = path.join(MEDIA_DIR, filename);
        
        // Save file
        fs.writeFileSync(filepath, buffer as Buffer);
        
        // Return public URL
        const url = `/uploads/media/${filename}`;
        console.log(`📁 Media saved: ${url} (${mimeType})`);
        
        return { url, mimeType };
    } catch (error) {
        console.error('Error downloading media:', error);
        return null;
    }
}

/**
 * Helper function to save a message to the database
 */
async function saveMessageToDB(msg: WAMessage, connectionId: number, sock?: WASocket | null) {
    if (!msg.key.remoteJid || !connectionId) return;
    
    const chatId = msg.key.remoteJid;
    const messageId = msg.key.id || '';
    
    // Ensure chat exists
    await saveOrUpdateChat(chatId, connectionId, msg);
    
    // Extract message content
    const text = msg.message?.conversation || 
                msg.message?.extendedTextMessage?.text ||
                msg.message?.imageMessage?.caption ||
                msg.message?.videoMessage?.caption ||
                msg.message?.documentMessage?.caption ||
                null;
    
    // Check for media
    const hasMedia = !!(msg.message?.imageMessage || 
                       msg.message?.videoMessage || 
                       msg.message?.documentMessage ||
                       msg.message?.audioMessage ||
                       msg.message?.stickerMessage);
    
    let mediaType: string | null = null;
    if (msg.message?.imageMessage) mediaType = 'image';
    else if (msg.message?.videoMessage) mediaType = 'video';
    else if (msg.message?.documentMessage) mediaType = 'document';
    else if (msg.message?.audioMessage) mediaType = 'audio';
    else if (msg.message?.stickerMessage) mediaType = 'sticker';
    
    // Download media if present and we have a socket
    let mediaUrl: string | null = null;
    let mediaMimeType: string | null = null;
    
    if (hasMedia && sock) {
        const mediaResult = await downloadAndSaveMedia(msg, sock);
        if (mediaResult) {
            mediaUrl = mediaResult.url;
            mediaMimeType = mediaResult.mimeType;
        }
    }
    
    // Check if message already exists (usando findFirst ao invés de findUnique)
    const existingMessage = await prisma.message.findFirst({
        where: { 
            messageId,
            chatId 
        }
    });

    if (existingMessage) {
        // Update status if needed, or update media if it was downloaded now
        if ((msg.key.fromMe && msg.status) || (mediaUrl && !existingMessage.mediaUrl)) {
            await prisma.message.update({
                where: { id: existingMessage.id },
                data: {
                    status: msg.status === 3 ? 'READ' : msg.status === 2 ? 'DELIVERED' : 'SENT',
                    ...(mediaUrl && !existingMessage.mediaUrl ? { mediaUrl, mediaMimeType } : {})
                }
            });
        }
        return;
    }

    // Get document filename if present
    const mediaCaption = msg.message?.documentMessage?.fileName || 
                        msg.message?.imageMessage?.caption ||
                        msg.message?.videoMessage?.caption ||
                        null;

    // Transcrever áudio se for uma mensagem de áudio recebida (não enviada por nós)
    let audioTranscription: string | null = null;
    if (mediaType === 'audio' && mediaUrl && !msg.key.fromMe) {
        console.log(`🎵 Connection #${connectionId}: Transcribing incoming audio...`);
        try {
            audioTranscription = await transcribeAudio(mediaUrl);
            if (audioTranscription) {
                console.log(`🎵 Connection #${connectionId}: Audio transcribed: "${audioTranscription.substring(0, 50)}..."`);
            } else {
                console.log(`🎵 Connection #${connectionId}: Audio transcription failed or empty`);
            }
        } catch (error) {
            console.error(`🎵 Connection #${connectionId}: Error transcribing audio:`, error);
        }
    }

    // Insert new message
    await prisma.message.create({
        data: {
            messageId,
            chatId,
            fromMe: msg.key.fromMe || false,
            text: audioTranscription ? `[Áudio]: ${audioTranscription}` : text, // Se for áudio transcrito, usar como texto
            hasMedia,
            mediaType,
            mediaUrl,
            mediaMimeType,
            mediaCaption,
            audioTranscription,
            status: msg.key.fromMe 
                ? (msg.status === 3 ? 'READ' : msg.status === 2 ? 'DELIVERED' : 'SENT')
                : 'DELIVERED',
            senderNumber: msg.key.participant || msg.key.remoteJid || null,
            senderName: msg.pushName || null,
            timestamp: new Date(Number(msg.messageTimestamp) * 1000),
        }
    });
}

/**
 * Create a new inbox slot in the database (before connecting)
 * Returns the connectionId
 */
export async function createInboxSlot(userId: number, displayName?: string): Promise<number> {
    const count = await prisma.whatsAppConnection.count({
        where: { createdByUserId: userId }
    });
    
    const inboxName = displayName || `Inbox Free ${count + 1}`;
    
    const connection = await prisma.whatsAppConnection.create({
        data: {
            type: 'PIRATE',
            status: 'DISCONNECTED',
            createdByUserId: userId,
            displayName: inboxName,
            isShared: false,
        }
    });
    
    // Grant access to creator
    await grantNumberAccess(userId, connection.id, {
        canRead: true,
        canWrite: true,
        canManage: true,
    });
    
    // Log activity
    await logActivity(
        'INBOX_CREATED',
        userId,
        'WhatsAppConnection',
        String(connection.id),
        { displayName: inboxName }
    );
    
    console.log(`📦 User ${userId}: Created new inbox slot #${connection.id} - "${inboxName}"`);
    
    return connection.id;
}

/**
 * Get all inbox slots for a user
 */
export async function getUserInboxes(userId: number) {
    // Check user role
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    });
    
    let inboxes;
    
    if (user?.role === 'ADMIN') {
        // Admin sees all pirate connections
        inboxes = await prisma.whatsAppConnection.findMany({
            where: {
                type: 'PIRATE'
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                displayName: true,
                phoneNumber: true,
                status: true,
                lastConnectedAt: true,
                createdByUserId: true,
                createdBy: {
                    select: {
                        name: true
                    }
                }
            }
        });
    } else {
        // Atendente sees only their own or shared connections
        const accesses = await prisma.numberAccess.findMany({
            where: {
                userId,
                canRead: true
            },
            select: { connectionId: true }
        });
        const connectionIds = accesses.map(a => a.connectionId);
        
        inboxes = await prisma.whatsAppConnection.findMany({
            where: {
                id: { in: connectionIds },
                type: 'PIRATE'
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                displayName: true,
                phoneNumber: true,
                status: true,
                lastConnectedAt: true,
                createdByUserId: true,
                createdBy: {
                    select: {
                        name: true
                    }
                }
            }
        });
    }
    
    // Add live connection status
    return inboxes.map(inbox => {
        const liveInstance = connections.get(inbox.id);
        return {
            ...inbox,
            liveStatus: liveInstance?.connectionStatus || inbox.status.toLowerCase(),
            isConnecting: liveInstance?.connectionStatus === 'connecting',
            hasQRCode: liveInstance?.qrCodeData !== null
        };
    });
}

/**
 * Delete an inbox slot
 */
export async function deleteInbox(connectionId: number, userId: number): Promise<boolean> {
    // Check if user has manage permission
    const access = await prisma.numberAccess.findFirst({
        where: {
            userId,
            connectionId,
            canManage: true
        }
    });
    
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    });
    
    if (!access && user?.role !== 'ADMIN') {
        throw new Error('Permission denied');
    }
    
    // Disconnect if connected
    const instance = connections.get(connectionId);
    if (instance?.sock) {
        try {
            await instance.sock.logout();
        } catch (e) {
            // Ignore errors on logout
        }
        instance.sock = null;
        connections.delete(connectionId);
    }
    
    // Delete auth folder
    const fs = require('fs');
    const path = require('path');
    const authPath = path.join(process.cwd(), `auth_info_baileys_conn_${connectionId}`);
    if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
    }
    
    // Delete from database (cascades to chats, messages, accesses)
    await prisma.whatsAppConnection.delete({
        where: { id: connectionId }
    });
    
    console.log(`🗑️  User ${userId}: Deleted inbox #${connectionId}`);
    
    return true;
}

/**
 * Update inbox display name
 */
export async function updateInboxName(connectionId: number, userId: number, newName: string): Promise<boolean> {
    const access = await prisma.numberAccess.findFirst({
        where: {
            userId,
            connectionId,
            canManage: true
        }
    });
    
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    });
    
    if (!access && user?.role !== 'ADMIN') {
        throw new Error('Permission denied');
    }
    
    await prisma.whatsAppConnection.update({
        where: { id: connectionId },
        data: { displayName: newName }
    });
    
    return true;
}

/**
 * Initialize Baileys WhatsApp connection for a specific connectionId
 * Returns the QR code as base64 string when available
 */
export async function initBaileysConnection(connectionId: number, userId: number): Promise<string | null> {
    try {
        // Verify connection exists in database
        const dbConnection = await prisma.whatsAppConnection.findUnique({
            where: { id: connectionId }
        });
        
        if (!dbConnection) {
            throw new Error(`Connection ${connectionId} not found in database`);
        }
        
        // Get or create connection instance
        const instance = getConnectionInstance(connectionId, userId);
        
        console.log(`\n🚀 initBaileysConnection called for Connection #${connectionId} (User ${userId})`);
        console.log(`   Current state: status=${instance.connectionStatus}, phone=${instance.phoneNumber}`);
        
        // If already connected, return null
        if (instance.sock && instance.connectionStatus === 'connected') {
            console.log(`✅ Connection #${connectionId} already connected`);
            return null;
        }

        // If connecting with existing socket, return current QR
        if (instance.sock && instance.connectionStatus === 'connecting' && instance.qrCodeData) {
            console.log(`🔄 Connection #${connectionId} already connecting, returning existing QR`);
            return instance.qrCodeData;
        }

        console.log(`🔄 Creating new Baileys connection for #${connectionId}...`);

        // Use multi-file auth state to persist login (one folder per connectionId)
        const authFolder = `auth_info_baileys_conn_${connectionId}`;
        const { state, saveCreds } = await useMultiFileAuthState(authFolder);
        
        // Verifica se já existe credenciais salvas (sessão anterior)
        const hasExistingCreds = state.creds && Object.keys(state.creds).length > 0;
        if (hasExistingCreds) {
            console.log(`🔑 Connection #${connectionId}: Credenciais encontradas! Tentando reconectar...`);
        } else {
            console.log(`📂 Connection #${connectionId}: Nenhuma credencial salva. QR code será gerado...`);
        }

        // Create the socket connection with proper configuration
        instance.sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger,
            browser: ['Chrome (Linux)', '', ''],
            syncFullHistory: false,
            markOnlineOnConnect: false,
            getMessage: async () => undefined,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
            generateHighQualityLinkPreview: false,
            emitOwnEvents: false,
            fireInitQueries: true,
            retryRequestDelayMs: 250,
        });

        console.log(`🔌 Connection #${connectionId}: Socket created, waiting for QR code...`);

        // Reset status
        instance.connectionStatus = 'connecting';
        instance.qrCodeData = null;

        // Clear any existing timeouts
        if (instance.qrCodeTimeout) {
            clearTimeout(instance.qrCodeTimeout);
            instance.qrCodeTimeout = null;
        }
        if (instance.connectionTimeout) {
            clearTimeout(instance.connectionTimeout);
            instance.connectionTimeout = null;
        }

        // Update database status
        await prisma.whatsAppConnection.update({
            where: { id: connectionId },
            data: { status: 'CONNECTING' }
        });

        // Timeout de segurança: se não gerar QR em 10s, limpa credenciais corrompidas
        instance.connectionTimeout = setTimeout(() => {
            if (instance.connectionStatus === 'connecting' && !instance.qrCodeData && instance.sock) {
                console.log(`⚠️  Connection #${connectionId}: Timeout: Não gerou QR code em 10s.`);
                console.log(`🗑️  Connection #${connectionId}: Limpando credenciais...`);
                
                try {
                    const fs = require('fs');
                    const path = require('path');
                    const authPath = path.join(process.cwd(), authFolder);
                    
                    if (fs.existsSync(authPath)) {
                        fs.rmSync(authPath, { recursive: true, force: true });
                        console.log(`✅ Connection #${connectionId}: Credenciais removidas.`);
                    }
                } catch (cleanupError) {
                    console.error(`Erro ao limpar credenciais #${connectionId}:`, cleanupError);
                }
                
                // Fecha a conexão
                if (instance.sock) {
                    instance.sock.end(undefined);
                }
                instance.connectionStatus = 'disconnected';
                instance.sock = null;
                instance.qrCodeData = null;
                
                // Update database
                prisma.whatsAppConnection.update({
                    where: { id: connectionId },
                    data: { status: 'DISCONNECTED' }
                }).catch(console.error);
            }
        }, 10000);

        // Handle QR code updates
        instance.sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr, isNewLogin, isOnline } = update;

            console.log(`📡 Connection #${connectionId} - Update:`, { 
                connection, 
                isNewLogin, 
                isOnline,
                hasQR: !!qr 
            });

            // If QR code is available, convert to base64
            if (qr) {
                try {
                    instance.qrCodeData = await QRCode.toDataURL(qr);
                    console.log(`✅ Connection #${connectionId}: QR Code generated successfully`);
                    
                    // Clear connection timeout (credenciais OK, gerou QR)
                    if (instance.connectionTimeout) {
                        clearTimeout(instance.connectionTimeout);
                        instance.connectionTimeout = null;
                    }
                    
                    // Clear any existing QR timeout
                    if (instance.qrCodeTimeout) {
                        clearTimeout(instance.qrCodeTimeout);
                    }
                    
                    // Set a long timeout just to clean up memory
                    instance.qrCodeTimeout = setTimeout(() => {
                        console.log(`Connection #${connectionId}: QR code cleanup after timeout`);
                        instance.qrCodeData = null;
                    }, 60000);
                } catch (err) {
                    console.error(`Connection #${connectionId}: Error generating QR code:`, err);
                }
            }

            // Handle connection state changes
            if (connection === 'close') {
                const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                const isLoggedOut = statusCode === DisconnectReason.loggedOut;
                const isQRTimeout = statusCode === 401;
                const shouldReconnect = !isLoggedOut && statusCode !== DisconnectReason.loggedOut;

                console.log(`Connection #${connectionId}: Closed. Status: ${statusCode}, QRTimeout: ${isQRTimeout}`);

                // Clear timeouts
                if (instance.connectionTimeout) {
                    clearTimeout(instance.connectionTimeout);
                    instance.connectionTimeout = null;
                }
                if (instance.qrCodeTimeout) {
                    clearTimeout(instance.qrCodeTimeout);
                    instance.qrCodeTimeout = null;
                }

                if (isQRTimeout) {
                    console.log(`⚠️  Connection #${connectionId}: Erro 401 - Credenciais inválidas`);
                    
                    if (!instance.qrCodeData) {
                        console.log(`🗑️  Connection #${connectionId}: Limpando credenciais...`);
                        try {
                            const fs = require('fs');
                            const path = require('path');
                            const authPath = path.join(process.cwd(), authFolder);
                            
                            if (fs.existsSync(authPath)) {
                                fs.rmSync(authPath, { recursive: true, force: true });
                            }
                        } catch (cleanupError) {
                            console.error(`Erro ao limpar credenciais #${connectionId}:`, cleanupError);
                        }
                    }
                }
                
                instance.connectionStatus = 'disconnected';
                instance.sock = null;
                instance.qrCodeData = null;
                
                // Update database
                await prisma.whatsAppConnection.update({
                    where: { id: connectionId },
                    data: {
                        status: 'DISCONNECTED',
                        lastDisconnectedAt: new Date(),
                    }
                }).catch(console.error);
                
            } else if (connection === 'connecting') {
                console.log(`📱 Connection #${connectionId}: Connecting...`);
                instance.connectionStatus = 'connecting';
            } else if (connection === 'open') {
                const wasAutoReconnect = !instance.qrCodeData && !isNewLogin;
                
                if (wasAutoReconnect) {
                    console.log(`🔄 ✅ Connection #${connectionId}: Reconexão automática!`);
                } else {
                    console.log(`🎉 Connection #${connectionId}: Connected successfully!`);
                }
                
                instance.connectionStatus = 'connected';
                instance.qrCodeData = null;
                
                // Clear timeouts
                if (instance.connectionTimeout) {
                    clearTimeout(instance.connectionTimeout);
                    instance.connectionTimeout = null;
                }
                if (instance.qrCodeTimeout) {
                    clearTimeout(instance.qrCodeTimeout);
                    instance.qrCodeTimeout = null;
                }
                
                // Get connected phone number
                const phoneNumber = instance.sock?.user?.id?.split(':')[0] || null;
                const displayName = instance.sock?.user?.name || null;
                
                instance.phoneNumber = phoneNumber;
                
                console.log(`\n=== Connection #${connectionId} Connected ===`);
                console.log(`📞 Phone Number: ${phoneNumber}`);
                console.log(`👤 Display Name: ${displayName}`);
                console.log(`===========================\n`);
                
                // Update database
                try {
                    await prisma.whatsAppConnection.update({
                        where: { id: connectionId },
                        data: {
                            status: 'CONNECTED',
                            phoneNumber: phoneNumber,
                            displayName: displayName || dbConnection.displayName,
                            lastConnectedAt: new Date(),
                        }
                    });
                    
                    // Log activity
                    await logActivity(
                        'CONNECTION_CONNECTED',
                        userId,
                        'WhatsAppConnection',
                        String(connectionId),
                        { phoneNumber }
                    );
                } catch (dbError) {
                    console.error(`Connection #${connectionId}: Error updating database:`, dbError);
                }
            }
        });

        // Save credentials whenever they're updated
        instance.sock.ev.on('creds.update', async () => {
            console.log(`💾 Connection #${connectionId}: Saving credentials...`);
            await saveCreds();
        });

        console.log(`🎧 Connection #${connectionId}: Event listeners registered`);

        // Handle incoming messages
        instance.sock.ev.on('messages.upsert', async ({ messages, type }) => {
            console.log(`📩 Connection #${connectionId}: Received ${messages.length} message(s), type: ${type}`);
            
            if (type === 'notify') {
                for (const msg of messages) {
                    try {
                        const chatId = msg.key.remoteJid;
                        const fromMe = msg.key.fromMe;
                        const hasMedia = !!(msg.message?.imageMessage || msg.message?.videoMessage || 
                                          msg.message?.audioMessage || msg.message?.documentMessage ||
                                          msg.message?.stickerMessage);
                        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || 
                                    (hasMedia ? '[mídia]' : '[mensagem]');
                        
                        console.log(`📨 Connection #${connectionId}: Message - Chat: ${chatId}, FromMe: ${fromMe}, Text: ${text?.substring(0, 50)}${hasMedia ? ' 📎' : ''}`);
                        
                        // Pass socket to download media
                        await saveMessageToDB(msg, connectionId, instance.sock);
                        
                        console.log(`✅ Connection #${connectionId}: Message saved`);

                        // 🤖 AI AUTO-RESPONSE with DEBOUNCE
                        // Waits 10 seconds after last message before responding to capture full context
                        if (!fromMe && chatId && !chatId.endsWith('@g.us') && text && text !== '[mídia]' && text !== '[mensagem]') {
                            const debounceKey = `${connectionId}:${chatId}`;
                            
                            // Clear existing timeout if user sends another message
                            if (aiResponseDebounce.has(debounceKey)) {
                                clearTimeout(aiResponseDebounce.get(debounceKey)!);
                                console.log(`🤖 Connection #${connectionId}: Debounce reset for ${chatId} - waiting for more messages...`);
                            }

                            // Set new timeout - will execute after 10 seconds of no new messages
                            const timeout = setTimeout(async () => {
                                aiResponseDebounce.delete(debounceKey);
                                
                                try {
                                    // Get fresh chat data from database
                                    const chat = await prisma.chat.findUnique({
                                        where: { id: chatId },
                                        select: { contactName: true, isHumanTakeover: true, isClosed: true, isAIActive: true }
                                    });

                                    // Skip if chat is in human mode or closed
                                    if (chat?.isHumanTakeover || chat?.isClosed || chat?.isAIActive === false) {
                                        console.log(`🤖 Connection #${connectionId}: AI skipped - chat in human/closed mode`);
                                        return;
                                    }

                                    const contactName = chat?.contactName || 'Cliente';

                                    // Get all recent unresponded messages from the client
                                    // This captures messages like "oi" + "tudo bem" together
                                    const recentMessages = await prisma.message.findMany({
                                        where: {
                                            chatId,
                                            fromMe: false,
                                            timestamp: {
                                                gte: new Date(Date.now() - 60000) // Last 60 seconds
                                            }
                                        },
                                        orderBy: { timestamp: 'asc' },
                                        select: { text: true, timestamp: true }
                                    });

                                    // Check if there was an AI response after these messages
                                    const lastAIResponse = await prisma.message.findFirst({
                                        where: {
                                            chatId,
                                            fromMe: true,
                                            sentByAI: true
                                        },
                                        orderBy: { timestamp: 'desc' },
                                        select: { timestamp: true }
                                    });

                                    // Filter to only get messages that came AFTER the last AI response
                                    const unrespondedMessages = recentMessages.filter(msg => {
                                        if (!lastAIResponse) return true;
                                        return msg.timestamp > lastAIResponse.timestamp;
                                    });

                                    if (unrespondedMessages.length === 0) {
                                        console.log(`🤖 Connection #${connectionId}: No unresponded messages for ${chatId}`);
                                        return;
                                    }

                                    // Combine all unresponded messages into one context
                                    const combinedText = unrespondedMessages
                                        .map(m => m.text)
                                        .filter(t => t && t.trim())
                                        .join('\n');

                                    if (!combinedText.trim()) {
                                        return;
                                    }

                                    console.log(`🤖 Connection #${connectionId}: Processing AI response for ${contactName}`);
                                    console.log(`   Combined messages (${unrespondedMessages.length}): "${combinedText.substring(0, 100)}..."`);

                                    // Generate AI response with full context
                                    const aiResponse = await generateAIResponse(chatId, combinedText, contactName);

                                    if (aiResponse.success && aiResponse.message) {
                                        // Small additional delay to seem human (1-3 seconds)
                                        const typingDelay = Math.floor(Math.random() * 2000) + 1000;
                                        await new Promise(resolve => setTimeout(resolve, typingDelay));

                                        // Get fresh instance reference
                                        const currentInstance = connections.get(connectionId);
                                        
                                        // Send the AI response
                                        if (currentInstance?.sock && currentInstance.connectionStatus === 'connected') {
                                            await currentInstance.sock.sendMessage(chatId, { text: aiResponse.message });
                                            console.log(`🤖 Connection #${connectionId}: AI response sent to ${contactName}`);

                                            // Save AI message to database
                                            const aiMessageId = `AI_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                                            await prisma.message.create({
                                                data: {
                                                    messageId: aiMessageId,
                                                    chatId,
                                                    fromMe: true,
                                                    text: aiResponse.message,
                                                    status: 'SENT',
                                                    timestamp: new Date(),
                                                    sentByAI: true
                                                }
                                            });

                                            // Update chat last message
                                            await prisma.chat.update({
                                                where: { id: chatId },
                                                data: {
                                                    lastMessageAt: new Date(),
                                                    lastMessagePreview: aiResponse.message.substring(0, 100),
                                                    totalMessages: { increment: 1 }
                                                }
                                            });

                                            // If AI wants handoff, mark the chat
                                            if (aiResponse.shouldHandoff) {
                                                await markChatForHandoff(chatId);
                                                console.log(`🤖 Connection #${connectionId}: Chat marked for human handoff`);
                                            }
                                        }
                                    } else if (aiResponse.error) {
                                        console.log(`🤖 Connection #${connectionId}: AI error - ${aiResponse.error}`);
                                    }
                                } catch (aiError) {
                                    console.error(`🤖 Connection #${connectionId}: AI processing error:`, aiError);
                                }
                            }, AI_RESPONSE_DELAY);

                            aiResponseDebounce.set(debounceKey, timeout);
                            console.log(`🤖 Connection #${connectionId}: Debounce set for ${chatId} - will respond in ${AI_RESPONSE_DELAY/1000}s if no more messages`);
                        }
                    } catch (error) {
                        console.error(`❌ Connection #${connectionId}: Error saving message:`, error);
                    }
                }
            }
        });

        return instance.qrCodeData;
    } catch (error) {
        console.error(`Connection #${connectionId}: Error initializing:`, error);
        const instance = getExistingConnectionInstance(connectionId);
        if (instance) {
            instance.connectionStatus = 'disconnected';
        }
        throw error;
    }
}

/**
 * Get the current QR code for a connection
 */
export function getQRCode(connectionId: number): string | null {
    const instance = getExistingConnectionInstance(connectionId);
    return instance?.qrCodeData || null;
}

/**
 * Get current connection status
 */
export function getConnectionStatus(connectionId: number): 'disconnected' | 'connecting' | 'connected' {
    const instance = getExistingConnectionInstance(connectionId);
    return instance?.connectionStatus || 'disconnected';
}

/**
 * Get connection info for debugging
 */
export function getConnectionInfo(connectionId: number): { connectionId: number; phoneNumber: string | null; status: string } {
    const instance = getExistingConnectionInstance(connectionId);
    return {
        connectionId,
        phoneNumber: instance?.phoneNumber || null,
        status: instance?.connectionStatus || 'disconnected'
    };
}

/**
 * Disconnect from WhatsApp
 */
export async function disconnectBaileys(connectionId: number, userId: number): Promise<void> {
    const instance = getExistingConnectionInstance(connectionId);
    
    if (instance?.sock) {
        try {
            await instance.sock.logout();
        } catch (e) {
            // Ignore logout errors
        }
        instance.sock = null;
        instance.connectionStatus = 'disconnected';
        instance.qrCodeData = null;
        
        // Update database
        try {
            await prisma.whatsAppConnection.update({
                where: { id: connectionId },
                data: {
                    status: 'DISCONNECTED',
                    lastDisconnectedAt: new Date(),
                }
            });
            
            await logActivity(
                'CONNECTION_DISCONNECTED',
                userId,
                'WhatsAppConnection',
                String(connectionId),
                {}
            );
        } catch (error) {
            console.error(`Connection #${connectionId}: Error updating database on disconnect:`, error);
        }
        
        // Delete auth folder to force new QR on next connect
        const fs = require('fs');
        const path = require('path');
        const authPath = path.join(process.cwd(), `auth_info_baileys_conn_${connectionId}`);
        if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true });
        }
        
        console.log(`Connection #${connectionId}: Disconnected`);
    }
}

/**
 * Get the active socket instance
 */
export function getBaileysSocket(connectionId: number): WASocket | null {
    const instance = getExistingConnectionInstance(connectionId);
    return instance?.sock || null;
}

/**
 * Get all chats for a specific connection
 */
export async function getChats(connectionId: number, userId: number) {
    const instance = getExistingConnectionInstance(connectionId);
    
    if (!instance?.sock || instance.connectionStatus !== 'connected') {
        // Even if not connected, return chats from database
    }

    try {
        // Get connection phone number to filter out self-chats
        const connection = await prisma.whatsAppConnection.findUnique({
            where: { id: connectionId },
            select: { phoneNumber: true }
        });

        const ownNumbers = connection?.phoneNumber 
            ? [`${connection.phoneNumber}@s.whatsapp.net`, `${connection.phoneNumber}@g.us`]
            : [];

        const chats = await prisma.chat.findMany({
            where: {
                connectionId,
                id: {
                    notIn: ownNumbers
                },
                isGroup: false
            },
            orderBy: {
                lastMessageAt: 'desc'
            },
            select: {
                id: true,
                contactName: true,
                contactNumber: true,
                isGroup: true,
                lastMessagePreview: true,
                lastMessageAt: true,
                unreadCount: true,
                connectionId: true,
                isHumanTakeover: true,
                isClosed: true,
            }
        });

        return chats.map(chat => ({
            id: chat.id,
            name: chat.contactName,
            unreadCount: chat.unreadCount,
            lastMessage: chat.lastMessagePreview || 'Sem mensagens',
            timestamp: chat.lastMessageAt?.getTime() || Date.now(),
            isGroup: chat.isGroup,
            isHumanTakeover: chat.isHumanTakeover,
            isClosed: chat.isClosed,
        }));
    } catch (error) {
        console.error(`Connection #${connectionId}: Error getting chats:`, error);
        return [];
    }
}

/**
 * Get all chats for all connections the user has access to
 */
export async function getAllUserChats(userId: number) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });
        
        let connectionIds: number[] = [];
        
        if (user?.role === 'ADMIN') {
            const allConnections = await prisma.whatsAppConnection.findMany({
                where: { type: 'PIRATE' },
                select: { id: true }
            });
            connectionIds = allConnections.map(c => c.id);
        } else {
            const accesses = await prisma.numberAccess.findMany({
                where: { userId, canRead: true },
                select: { connectionId: true }
            });
            connectionIds = accesses.map(a => a.connectionId);
        }
        
        if (connectionIds.length === 0) {
            return [];
        }

        // Get all connection phone numbers
        const connectionsData = await prisma.whatsAppConnection.findMany({
            where: { id: { in: connectionIds } },
            select: { id: true, phoneNumber: true, displayName: true }
        });

        const ownNumbers = connectionsData
            .map(c => c.phoneNumber)
            .filter(Boolean)
            .map(num => [`${num}@s.whatsapp.net`, `${num}@g.us`])
            .flat();

        const chats = await prisma.chat.findMany({
            where: {
                connectionId: { in: connectionIds },
                id: { notIn: ownNumbers },
                isGroup: false
            },
            orderBy: { lastMessageAt: 'desc' },
            select: {
                id: true,
                contactName: true,
                contactNumber: true,
                isGroup: true,
                lastMessagePreview: true,
                lastMessageAt: true,
                unreadCount: true,
                connectionId: true,
                connection: {
                    select: {
                        displayName: true,
                        phoneNumber: true,
                    }
                }
            }
        });

        return chats.map(chat => ({
            id: chat.id,
            name: chat.contactName,
            unreadCount: chat.unreadCount,
            lastMessage: chat.lastMessagePreview || 'Sem mensagens',
            timestamp: chat.lastMessageAt?.getTime() || Date.now(),
            isGroup: chat.isGroup,
            connectionId: chat.connectionId,
            connectionInfo: {
                displayName: chat.connection.displayName,
                phoneNumber: chat.connection.phoneNumber
            }
        }));
    } catch (error) {
        console.error(`User ${userId}: Error getting all chats:`, error);
        return [];
    }
}

/**
 * Get messages for a specific chat
 */
export async function getChatMessages(chatId: string, connectionId: number) {
    try {
        const messages = await prisma.message.findMany({
            where: { chatId },
            orderBy: { timestamp: 'asc' },
            select: {
                id: true,
                messageId: true,
                fromMe: true,
                text: true,
                timestamp: true,
                status: true,
                hasMedia: true,
                mediaType: true,
                mediaUrl: true,
                audioTranscription: true,
                mediaCaption: true
            }
        });

        return messages;
    } catch (error) {
        console.error(`Connection #${connectionId}: Error getting messages:`, error);
        return [];
    }
}

/**
 * Send a message
 */
export async function sendMessage(connectionId: number, userId: number, chatId: string, text: string) {
    const instance = getExistingConnectionInstance(connectionId);
    
    if (!instance?.sock || instance.connectionStatus !== 'connected') {
        throw new Error('Not connected to WhatsApp');
    }

    try {
        const sentMsg = await instance.sock.sendMessage(chatId, { text });
        
        // Save to database (no media for text messages)
        await saveMessageToDB(sentMsg as WAMessage, connectionId, instance.sock);
        
        return sentMsg;
    } catch (error) {
        console.error(`Connection #${connectionId}: Error sending message:`, error);
        throw error;
    }
}

/**
 * Auto-reconnect all saved connections on server startup
 */
export async function autoReconnectAllConnections() {
    try {
        const fs = require('fs');
        const path = require('path');
        
        // Find all auth folders
        const files = fs.readdirSync(process.cwd());
        const authFolders = files.filter((f: string) => f.startsWith('auth_info_baileys_conn_'));
        
        for (const folder of authFolders) {
            const connectionId = parseInt(folder.replace('auth_info_baileys_conn_', ''));
            if (isNaN(connectionId)) continue;
            
            // Get connection from database
            const connection = await prisma.whatsAppConnection.findUnique({
                where: { id: connectionId },
                select: { id: true, createdByUserId: true, displayName: true }
            });
            
            if (connection) {
                console.log(`🔄 Auto-reconnecting inbox #${connectionId} (${connection.displayName})...`);
                try {
                    await initBaileysConnection(connection.id, connection.createdByUserId);
                } catch (e) {
                    console.error(`Failed to auto-reconnect #${connectionId}:`, e);
                }
            }
        }
    } catch (error) {
        console.error('Error during auto-reconnect:', error);
    }
}

// ============================================
// LEGACY FUNCTIONS FOR BACKWARD COMPATIBILITY
// ============================================

/**
 * @deprecated Use initBaileysConnection(connectionId, userId) instead
 * Legacy function that creates a slot and connects
 */
export async function initBaileysConnectionLegacy(userId: number): Promise<string | null> {
    // Get user's first inbox or create one
    const existingInboxes = await getUserInboxes(userId);
    
    let connectionId: number;
    
    if (existingInboxes.length > 0) {
        connectionId = existingInboxes[0].id;
    } else {
        connectionId = await createInboxSlot(userId);
    }
    
    return initBaileysConnection(connectionId, userId);
}

/**
 * @deprecated Use getConnectionStatus(connectionId) instead
 */
export function getConnectionStatusLegacy(userId: number): 'disconnected' | 'connecting' | 'connected' {
    // Find first connection for this user
    for (const [connId, instance] of connections.entries()) {
        if (instance.userId === userId) {
            return instance.connectionStatus;
        }
    }
    return 'disconnected';
}

/**
 * @deprecated Use getQRCode(connectionId) instead
 */
export function getQRCodeLegacy(userId: number): string | null {
    for (const [connId, instance] of connections.entries()) {
        if (instance.userId === userId && instance.qrCodeData) {
            return instance.qrCodeData;
        }
    }
    return null;
}
