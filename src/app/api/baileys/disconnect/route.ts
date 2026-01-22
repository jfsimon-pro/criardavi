import { NextRequest, NextResponse } from 'next/server';
import { disconnectBaileys } from '@/lib/baileys-server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

        // Get connectionId from request body
        const body = await request.json();
        const { connectionId } = body;

        if (!connectionId) {
            return NextResponse.json({
                success: false,
                message: 'connectionId is required'
            }, { status: 400 });
        }

        await disconnectBaileys(connectionId, userId);

        return NextResponse.json({
            success: true,
            message: 'Desconectado do WhatsApp com sucesso'
        });
    } catch (error) {
        console.error('Error disconnecting from Baileys:', error);
        return NextResponse.json({
            success: false,
            message: 'Erro ao desconectar do WhatsApp',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
