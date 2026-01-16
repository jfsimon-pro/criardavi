import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { initBaileysConnection } from '@/lib/baileys-server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ connectionId: string }>;
}

/**
 * POST /api/baileys/inboxes/[connectionId]/connect
 * Inicia a conexão WhatsApp para um inbox específico
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
        
        const { connectionId: connectionIdStr } = await params;
        const connectionId = parseInt(connectionIdStr);
        
        if (isNaN(connectionId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid connectionId' },
                { status: 400 }
            );
        }
        
        const userId = parseInt(session.user.id);
        
        // Check access (canManage required to connect)
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });
        
        if (user?.role !== 'ADMIN') {
            const access = await prisma.numberAccess.findFirst({
                where: { userId, connectionId, canManage: true }
            });
            
            if (!access) {
                return NextResponse.json(
                    { success: false, error: 'Permission denied' },
                    { status: 403 }
                );
            }
        }
        
        // Initialize connection
        const qrCode = await initBaileysConnection(connectionId, userId);
        
        return NextResponse.json({
            success: true,
            qrCode,
            message: qrCode ? 'QR code generated' : 'Connection initiated'
        });
    } catch (error) {
        console.error('Error connecting inbox:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

