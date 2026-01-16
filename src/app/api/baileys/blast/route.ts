import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendMessage, getConnectionStatus } from '@/lib/baileys-server';
import { prisma } from '@/lib/prisma';

interface BlastContact {
    cpf: string;
    nome: string;
    numero: string;
    status?: 'pending' | 'sent' | 'failed';
    error?: string;
}

/**
 * Normaliza um número de telefone brasileiro para o formato do WhatsApp
 * Formato esperado: 55 + DDD (2 dígitos) + 9 + número (8 dígitos) = 13 dígitos
 * 
 * Exemplos:
 * - 61996740830 → 5561996740830 (já tem o 9)
 * - 6196740830 → 5561996740830 (adiciona o 9)
 * - 5561996740830 → 5561996740830 (já está completo)
 * - 24992822790 → 5524992822790 (já tem o 9)
 */
function normalizePhoneNumber(phone: string): string | null {
    // Remove tudo que não for número
    let cleaned = phone.replace(/\D/g, '');
    
    // Se estiver vazio, é inválido
    if (!cleaned || cleaned.length < 10) {
        return null;
    }
    
    // Se já começa com 55 e tem 12-13 dígitos, pode já estar formatado
    if (cleaned.startsWith('55')) {
        // 55 + DDD + 9 + 8 dígitos = 13 dígitos (celular com 9)
        // 55 + DDD + 8 dígitos = 12 dígitos (celular sem 9, precisa adicionar)
        if (cleaned.length === 13) {
            // Já está completo com 55 + DDD + 9 + 8 dígitos
            return cleaned;
        } else if (cleaned.length === 12) {
            // Falta o 9: 55 + DDD (2) + 8 dígitos
            // Adiciona o 9 após o DDD
            const ddd = cleaned.slice(2, 4);
            const number = cleaned.slice(4);
            return `55${ddd}9${number}`;
        }
    }
    
    // Se tem 11 dígitos: DDD + 9 + 8 dígitos (já tem o 9)
    if (cleaned.length === 11) {
        return `55${cleaned}`;
    }
    
    // Se tem 10 dígitos: DDD + 8 dígitos (falta o 9)
    if (cleaned.length === 10) {
        const ddd = cleaned.slice(0, 2);
        const number = cleaned.slice(2);
        return `55${ddd}9${number}`;
    }
    
    // Se tem 9 dígitos: assume que falta DDD (inválido para nosso caso)
    // Se tem 8 dígitos: assume que falta DDD e o 9 (inválido para nosso caso)
    
    // Formato não reconhecido
    return null;
}

/**
 * Valida se um contato tem todos os campos necessários
 */
function validateContact(contact: BlastContact): { valid: boolean; error?: string } {
    if (!contact.nome || contact.nome.trim() === '') {
        return { valid: false, error: 'Nome vazio' };
    }
    
    if (!contact.numero || contact.numero.trim() === '') {
        return { valid: false, error: 'Número vazio' };
    }
    
    const normalized = normalizePhoneNumber(contact.numero);
    if (!normalized) {
        return { valid: false, error: `Número inválido: ${contact.numero}` };
    }
    
    return { valid: true };
}

/**
 * Delay helper para aguardar entre mensagens
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Gera um delay aleatório entre min e max milissegundos
 */
function randomDelay(minMs: number, maxMs: number): number {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * POST /api/baileys/blast
 * Inicia um disparo em massa
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            console.log('❌ Blast: Unauthorized - no session');
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        
        const userId = parseInt(session.user.id);
        const body = await request.json();
        const { connectionId, message, messages, contacts, delayMin = 35000, delayMax = 180000 } = body;
        
        // Support both single message (legacy) and array of messages
        let messageList: string[] = [];
        if (messages && Array.isArray(messages)) {
            messageList = messages.filter((m: string) => m && m.trim() !== '');
        } else if (message && typeof message === 'string' && message.trim() !== '') {
            messageList = [message];
        }
        
        console.log(`🔍 Blast Debug: userId=${userId}, connectionId=${connectionId}, messages=${messageList.length}`);
        
        if (!connectionId) {
            return NextResponse.json({ success: false, error: 'connectionId é obrigatório' }, { status: 400 });
        }
        
        if (messageList.length === 0) {
            return NextResponse.json({ success: false, error: 'Pelo menos uma mensagem é obrigatória' }, { status: 400 });
        }
        
        if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
            return NextResponse.json({ success: false, error: 'Lista de contatos é obrigatória' }, { status: 400 });
        }
        
        // Debug: Verificar conexão diretamente
        const connectionDirect = await prisma.whatsAppConnection.findUnique({
            where: { id: connectionId },
            include: { numberAccess: true }
        });
        console.log(`🔍 Blast Debug: Connection found=${!!connectionDirect}, id=${connectionDirect?.id}`);
        if (connectionDirect) {
            console.log(`🔍 Blast Debug: NumberAccess entries=${connectionDirect.numberAccess.length}`);
            connectionDirect.numberAccess.forEach(na => {
                console.log(`   - NumberAccess: userId=${na.userId}, canRead=${na.canRead}, canWrite=${na.canWrite}`);
            });
        }
        
        // Verificar se a conexão existe e pertence ao usuário
        const connection = await prisma.whatsAppConnection.findFirst({
            where: {
                id: connectionId,
                numberAccess: {
                    some: { userId }
                }
            }
        });
        
        console.log(`🔍 Blast Debug: Connection with access=${!!connection}`);
        
        if (!connection) {
            // Tentar criar acesso se não existir
            console.log(`⚠️ Blast: No access found, checking if connection exists...`);
            
            if (connectionDirect) {
                console.log(`🔧 Blast: Connection exists, creating NumberAccess for user ${userId}`);
                // Criar acesso para o usuário
                await prisma.numberAccess.create({
                    data: {
                        userId,
                        connectionId,
                        canRead: true,
                        canWrite: true,
                        canManage: true,
                        grantedBy: userId
                    }
                });
                console.log(`✅ Blast: NumberAccess created`);
            } else {
                return NextResponse.json({ success: false, error: 'Conexão não encontrada ou sem permissão' }, { status: 404 });
            }
        }
        
        // Verificar se está conectado
        const status = getConnectionStatus(connectionId);
        console.log(`🔍 Blast Debug: Connection status for #${connectionId} = ${status}`);
        if (status !== 'connected') {
            return NextResponse.json({ success: false, error: `WhatsApp não está conectado (status: ${status})` }, { status: 400 });
        }
        
        console.log(`✅ Blast: Starting blast for ${contacts.length} contacts...`);
        
        // Processar contatos
        const results: BlastContact[] = [];
        let sent = 0;
        let failed = 0;
        
        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i] as BlastContact;
            
            // Validar contato
            const validation = validateContact(contact);
            if (!validation.valid) {
                results.push({
                    ...contact,
                    status: 'failed',
                    error: validation.error
                });
                failed++;
                console.log(`📛 Blast #${connectionId}: Contato inválido - ${contact.nome}: ${validation.error}`);
                continue;
            }
            
            // Normalizar número
            const normalizedNumber = normalizePhoneNumber(contact.numero);
            if (!normalizedNumber) {
                results.push({
                    ...contact,
                    status: 'failed',
                    error: 'Número inválido após normalização'
                });
                failed++;
                continue;
            }
            
            // Formatar chatId para WhatsApp
            const chatId = `${normalizedNumber}@s.whatsapp.net`;
            
            // Selecionar mensagem aleatória do array
            const randomIndex = Math.floor(Math.random() * messageList.length);
            const selectedMessage = messageList[randomIndex];
            
            // Substituir variáveis na mensagem
            // {{NOME}} ou {{1}} → nome do contato
            // {{CPF}} ou {{2}} → CPF do contato
            let personalizedMessage = selectedMessage
                .replace(/\{\{NOME\}\}/gi, contact.nome)
                .replace(/\{\{1\}\}/g, contact.nome)
                .replace(/\{\{CPF\}\}/gi, contact.cpf || '')
                .replace(/\{\{2\}\}/g, contact.cpf || '');
            
            try {
                await sendMessage(connectionId, userId, chatId, personalizedMessage);
                results.push({
                    ...contact,
                    status: 'sent'
                });
                sent++;
                console.log(`✅ Blast #${connectionId}: [Msg ${randomIndex + 1}/${messageList.length}] Enviado para ${contact.nome} (${normalizedNumber})`);
            } catch (error: any) {
                results.push({
                    ...contact,
                    status: 'failed',
                    error: error.message || 'Erro ao enviar'
                });
                failed++;
                console.log(`❌ Blast #${connectionId}: Falha ao enviar para ${contact.nome}: ${error.message}`);
            }
            
            // Delay inteligente entre mensagens (exceto na última)
            if (i < contacts.length - 1) {
                const waitTime = randomDelay(delayMin, delayMax);
                console.log(`⏳ Blast #${connectionId}: Aguardando ${Math.round(waitTime/1000)}s antes do próximo...`);
                await delay(waitTime);
            }
        }
        
        console.log(`📊 Blast #${connectionId}: Concluído - ${sent} enviados, ${failed} falharam`);
        
        return NextResponse.json({
            success: true,
            summary: {
                total: contacts.length,
                sent,
                failed
            },
            results
        });
        
    } catch (error: any) {
        console.error('Blast API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

