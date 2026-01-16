import OpenAI from 'openai';
import { prisma } from './prisma';
import fs from 'fs';
import path from 'path';

// Cliente OpenAI - inicialização lazy para não quebrar se a chave não estiver configurada
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
    if (!openaiClient) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY não configurada. Adicione no arquivo .env');
        }
        openaiClient = new OpenAI({ apiKey });
    }
    return openaiClient;
}

interface AIResponse {
    success: boolean;
    message: string;
    shouldHandoff: boolean;
    error?: string;
}

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * Busca o histórico de mensagens de um chat para contexto
 * Inclui transcrições de áudio para manter contexto completo
 */
async function getChatHistory(chatId: string, limit: number = 10): Promise<ChatMessage[]> {
    const messages = await prisma.message.findMany({
        where: { chatId },
        orderBy: { timestamp: 'desc' },
        take: limit,
        select: {
            fromMe: true,
            text: true,
            sentByAI: true,
            hasMedia: true,
            mediaType: true,
            audioTranscription: true
        }
    });

    // Reverter para ordem cronológica e formatar
    return messages.reverse().map(msg => {
        // Se for áudio com transcrição, usar a transcrição
        if (msg.hasMedia && msg.mediaType === 'audio' && msg.audioTranscription) {
            return {
                role: msg.fromMe ? 'assistant' as const : 'user' as const,
                content: `[Áudio transcrito]: ${msg.audioTranscription}`
            };
        }
        
        // Se for outra mídia, indicar
        if (msg.hasMedia && !msg.text) {
            const mediaLabels: Record<string, string> = {
                'image': '[Enviou uma imagem]',
                'video': '[Enviou um vídeo]',
                'document': '[Enviou um documento]',
                'sticker': '[Enviou um sticker]',
                'audio': '[Enviou um áudio - não transcrito]'
            };
            return {
                role: msg.fromMe ? 'assistant' as const : 'user' as const,
                content: mediaLabels[msg.mediaType || ''] || '[Enviou uma mídia]'
            };
        }
        
        return {
            role: msg.fromMe ? 'assistant' as const : 'user' as const,
            content: msg.text || ''
        };
    }).filter(msg => msg.content.trim() !== '');
}

/**
 * Transcreve um arquivo de áudio usando Whisper da OpenAI
 * @param audioFilePath - Caminho do arquivo de áudio (relativo a /public ou absoluto)
 * @returns Texto transcrito ou null se falhar
 */
export async function transcribeAudio(audioFilePath: string): Promise<string | null> {
    try {
        const openai = getOpenAIClient();
        
        // Resolver o caminho do arquivo
        let fullPath = audioFilePath;
        if (audioFilePath.startsWith('/uploads/')) {
            fullPath = path.join(process.cwd(), 'public', audioFilePath);
        } else if (!path.isAbsolute(audioFilePath)) {
            fullPath = path.join(process.cwd(), 'public', audioFilePath);
        }
        
        // Verificar se o arquivo existe
        if (!fs.existsSync(fullPath)) {
            console.error(`🎵 Audio file not found: ${fullPath}`);
            return null;
        }
        
        console.log(`🎵 Transcribing audio: ${fullPath}`);
        
        // Criar stream do arquivo para enviar ao Whisper
        const audioFile = fs.createReadStream(fullPath);
        
        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            language: 'pt', // Português brasileiro
            response_format: 'text'
        });
        
        const transcribedText = typeof transcription === 'string' 
            ? transcription 
            : transcription.text || '';
        
        console.log(`🎵 Audio transcribed: "${transcribedText.substring(0, 100)}${transcribedText.length > 100 ? '...' : ''}"`);
        
        return transcribedText || null;
    } catch (error: any) {
        console.error('🎵 Error transcribing audio:', error.message || error);
        return null;
    }
}

/**
 * Busca a configuração de IA do banco
 */
async function getAIConfig() {
    let config = await prisma.aIConfig.findFirst();
    
    if (!config) {
        // Criar configuração padrão
        config = await prisma.aIConfig.create({
            data: {
                isActive: true,
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                temperature: 0.7,
                maxTokens: 1000,
                systemPrompt: `Você é um assistente virtual profissional e educado.
Seja breve, claro e use emojis ocasionalmente.

HANDOFF PARA HUMANO:
Se o cliente pedir para falar com humano, expressar frustração, ou você não souber responder, 
inclua [HANDOFF] no início da resposta e explique que vai transferir.`,
                maxMessagesPerChat: 20,
                responseDelay: 2,
            }
        });
    }
    
    return config;
}

/**
 * Gera uma resposta usando o ChatGPT
 */
export async function generateAIResponse(
    chatId: string,
    userMessage: string,
    contactName: string
): Promise<AIResponse> {
    try {
        // Buscar configuração
        const config = await getAIConfig();
        
        // Verificar se IA está ativa
        if (!config.isActive) {
            console.log('🤖 AI is disabled');
            return {
                success: false,
                message: '',
                shouldHandoff: false,
                error: 'AI is disabled'
            };
        }

        // Verificar se o chat já foi marcado para handoff humano
        const chat = await prisma.chat.findUnique({
            where: { id: chatId },
            select: { isHumanTakeover: true, isClosed: true, isAIActive: true }
        });

        if (chat?.isHumanTakeover || chat?.isClosed || chat?.isAIActive === false) {
            console.log(`🤖 AI skipped for chat ${chatId} - handoff/closed/AI disabled`);
            return {
                success: false,
                message: '',
                shouldHandoff: false,
                error: 'Chat is in human mode or closed'
            };
        }

        // Buscar histórico de conversas para contexto
        const history = await getChatHistory(chatId, config.maxMessagesPerChat || 10);

        // Montar o prompt do sistema com informações do contato
        const systemPrompt = `${config.systemPrompt}

=== INFORMAÇÕES DO CONTATO ATUAL ===
- Nome: ${contactName}

=== INSTRUÇÕES FINAIS ===
1. Substitua {nome} pelo nome do contato: ${contactName}
2. Responda de forma NATURAL e HUMANA
3. Quando o cliente enviar documentos/dados bancários E você confirmar recebimento para digitar contrato, inclua [HANDOFF] no INÍCIO da resposta
4. Mantenha respostas CURTAS e no estilo WhatsApp
5. NUNCA diga que é IA ou robô - você é um humano real`;

        // Montar mensagens para a API
        const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: userMessage }
        ];

        console.log(`🤖 Generating AI response for chat ${chatId}...`);
        console.log(`   System prompt: ${config.systemPrompt.substring(0, 100)}...`);
        console.log(`   History messages: ${history.length}`);
        console.log(`   User message: ${userMessage.substring(0, 50)}...`);

        // Chamar a API do OpenAI
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: config.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: messages as any,
            temperature: config.temperature || 0.7,
            max_tokens: config.maxTokens || 1000,
        });

        const responseText = completion.choices[0]?.message?.content || '';
        
        if (!responseText) {
            console.log('🤖 AI returned empty response');
            return {
                success: false,
                message: '',
                shouldHandoff: false,
                error: 'Empty response from AI'
            };
        }

        // Verificar se a IA quer fazer handoff
        const shouldHandoff = responseText.trim().toUpperCase().startsWith('[HANDOFF]');
        
        // Remover o marcador [HANDOFF] da resposta final se existir
        let cleanMessage = responseText;
        if (shouldHandoff) {
            cleanMessage = responseText.replace(/^\[HANDOFF\]\s*/i, '').trim();
        }

        console.log(`🤖 AI Response generated:`);
        console.log(`   Should handoff: ${shouldHandoff}`);
        console.log(`   Response: ${cleanMessage.substring(0, 100)}...`);

        return {
            success: true,
            message: cleanMessage,
            shouldHandoff
        };

    } catch (error: any) {
        console.error('🤖 Error generating AI response:', error);
        
        // Erro específico de API key
        if (error.message?.includes('API key')) {
            return {
                success: false,
                message: '',
                shouldHandoff: false,
                error: 'Invalid OpenAI API key'
            };
        }
        
        return {
            success: false,
            message: '',
            shouldHandoff: false,
            error: error.message || 'Unknown error'
        };
    }
}

/**
 * Verifica se deve enviar follow-up para um chat
 */
export async function checkAndSendFollowUp(chatId: string, connectionId: number): Promise<{
    shouldSend: boolean;
    message?: string;
    stepIndex?: number;
}> {
    try {
        const config = await getAIConfig();
        
        if (!config.isActive) {
            return { shouldSend: false };
        }

        // Buscar follow-ups configurados
        const followUps = config.workingHours as any[] || [];
        
        if (followUps.length === 0) {
            return { shouldSend: false };
        }

        // Buscar última mensagem do chat
        const lastMessage = await prisma.message.findFirst({
            where: { chatId },
            orderBy: { timestamp: 'desc' },
            select: { timestamp: true, fromMe: true }
        });

        if (!lastMessage || !lastMessage.fromMe) {
            // Última mensagem foi do cliente, não enviar follow-up ainda
            return { shouldSend: false };
        }

        // Calcular tempo desde última mensagem
        const timeSinceLastMessage = Date.now() - lastMessage.timestamp.getTime();

        // Verificar qual step de follow-up deve ser enviado
        for (let i = 0; i < followUps.length; i++) {
            const step = followUps[i];
            let waitTimeMs = step.time * 1000;
            
            // Converter unidade
            if (step.unit === 'minutos') waitTimeMs *= 60;
            else if (step.unit === 'horas') waitTimeMs *= 3600;
            else if (step.unit === 'dias') waitTimeMs *= 86400;

            // TODO: Verificar se este step já foi enviado
            // Por agora, só envia o primeiro step que atingiu o tempo
            if (timeSinceLastMessage >= waitTimeMs) {
                return {
                    shouldSend: true,
                    message: step.message,
                    stepIndex: i
                };
            }
        }

        return { shouldSend: false };
    } catch (error) {
        console.error('Error checking follow-up:', error);
        return { shouldSend: false };
    }
}

/**
 * Marca um chat para handoff humano
 */
export async function markChatForHandoff(chatId: string): Promise<boolean> {
    try {
        await prisma.chat.update({
            where: { id: chatId },
            data: {
                isHumanTakeover: true,
                isAIActive: false
            }
        });
        console.log(`✅ Chat ${chatId} marked for human handoff`);
        return true;
    } catch (error) {
        console.error('Error marking chat for handoff:', error);
        return false;
    }
}

