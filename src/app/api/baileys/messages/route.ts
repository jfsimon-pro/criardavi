import { NextRequest, NextResponse } from 'next/server';
import { getChatMessages, getConnectionStatus } from '@/lib/baileys-server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        // Get user from session
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({
                success: false,
                message: 'Não autenticado'
            }, { status: 401 });
        }

        const userId = parseInt(session.user.id);

        // Get chatId and connectionId from query parameters
        const { searchParams } = new URL(request.url);
        const chatId = searchParams.get('chatId');
        const connectionIdParam = searchParams.get('connectionId');

        if (!connectionIdParam) {
            return NextResponse.json({
                success: false,
                message: 'connectionId is required',
                messages: []
            }, { status: 400 });
        }
        const connectionId = parseInt(connectionIdParam);

        const status = getConnectionStatus(connectionId);

        if (status !== 'connected') {
            return NextResponse.json({
                success: false,
                message: 'WhatsApp não está conectado',
                messages: []
            }, { status: 400 });
        }

        if (!chatId) {
            return NextResponse.json({
                success: false,
                message: 'chatId é obrigatório',
                messages: []
            }, { status: 400 });
        }

        const messages = await getChatMessages(chatId, connectionId);

        // Format messages for frontend
        const formattedMessages = messages.map((msg) => ({
            id: msg.id,
            fromMe: msg.fromMe,
            text: msg.text || (msg.hasMedia ? `[${msg.mediaType}]` : '[Mensagem vazia]'),
            timestamp: msg.timestamp.getTime(),
            status: msg.status === 'READ' ? 3 : msg.status === 'DELIVERED' ? 2 : 1
        }));

        return NextResponse.json({
            success: true,
            messages: formattedMessages
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({
            success: false,
            message: 'Erro ao buscar mensagens',
            error: error instanceof Error ? error.message : 'Unknown error',
            messages: []
        }, { status: 500 });
    }
}

