import { NextRequest, NextResponse } from 'next/server';
import { sendMessage, getConnectionStatus } from '@/lib/baileys-server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
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
        
        const status = getConnectionStatus(userId);
        
        if (status !== 'connected') {
            return NextResponse.json({
                success: false,
                message: 'WhatsApp não está conectado'
            }, { status: 400 });
        }

        const body = await request.json();
        const { to, message } = body;

        if (!to || !message) {
            return NextResponse.json({
                success: false,
                message: 'Campos "to" e "message" são obrigatórios'
            }, { status: 400 });
        }

        const result = await sendMessage(userId, to, message);

        return NextResponse.json({
            success: true,
            message: 'Mensagem enviada com sucesso',
            result
        });
    } catch (error) {
        console.error('Error sending message:', error);
        return NextResponse.json({
            success: false,
            message: 'Erro ao enviar mensagem',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

