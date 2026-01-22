import { NextRequest, NextResponse } from 'next/server';
import { initBaileysConnection, getQRCode } from '@/lib/baileys-server';
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

        // Initialize the Baileys connection
        await initBaileysConnection(userId);

        // Wait a bit longer for QR code to be properly generated
        // Baileys needs time to initialize and generate the QR
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Get the QR code
        const qrCode = getQRCode(userId);

        if (qrCode) {
            return NextResponse.json({
                success: true,
                qrCode,
                message: 'QR Code gerado. Escaneie com seu WhatsApp.'
            });
        } else {
            return NextResponse.json({
                success: false,
                message: 'Aguardando geração do QR Code...'
            }, { status: 202 }); // 202 Accepted - processing
        }
    } catch (error) {
        console.error('Error connecting to Baileys:', error);
        return NextResponse.json({
            success: false,
            message: 'Erro ao conectar com WhatsApp',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
