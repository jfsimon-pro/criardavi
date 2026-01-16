import { NextRequest, NextResponse } from 'next/server';
import { getConnectionStatus, getQRCode, getConnectionInfo } from '@/lib/baileys-server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

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
        
        const status = getConnectionStatus(userId);
        const qrCode = getQRCode(userId);
        const info = getConnectionInfo(userId);

        return NextResponse.json({
            success: true,
            status,
            qrCode: status === 'connecting' ? qrCode : null,
            connectionInfo: info // Para debug
        });
    } catch (error) {
        console.error('Error getting Baileys status:', error);
        return NextResponse.json({
            success: false,
            message: 'Erro ao obter status da conexão',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
