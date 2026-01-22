import { NextRequest, NextResponse } from 'next/server';
import { getChats, getConnectionStatus } from '@/lib/baileys-server';
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

        // Get connectionId from query params
        const connectionIdParam = request.nextUrl.searchParams.get('connectionId');
        if (!connectionIdParam) {
            return NextResponse.json({
                success: false,
                message: 'connectionId is required'
            }, { status: 400 });
        }
        const connectionId = parseInt(connectionIdParam);

        const status = getConnectionStatus(connectionId);

        if (status !== 'connected') {
            return NextResponse.json({
                success: false,
                message: 'WhatsApp não está conectado',
                chats: []
            }, { status: 400 });
        }

        const chats = await getChats(connectionId, userId);

        return NextResponse.json({
            success: true,
            chats
        });
    } catch (error) {
        console.error('Error fetching chats:', error);
        return NextResponse.json({
            success: false,
            message: 'Erro ao buscar conversas',
            error: error instanceof Error ? error.message : 'Unknown error',
            chats: []
        }, { status: 500 });
    }
}

