import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnectionStatus, getQRCode, getConnectionInfo } from '@/lib/baileys-server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ connectionId: string }>;
}

/**
 * GET /api/baileys/inboxes/[connectionId]/status
 * Retorna o status atual da conexão
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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
        
        // Check access
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });
        
        if (user?.role !== 'ADMIN') {
            const access = await prisma.numberAccess.findFirst({
                where: { userId, connectionId, canRead: true }
            });
            
            if (!access) {
                return NextResponse.json(
                    { success: false, error: 'Access denied' },
                    { status: 403 }
                );
            }
        }
        
        // Get live status
        const status = getConnectionStatus(connectionId);
        const qrCode = getQRCode(connectionId);
        const info = getConnectionInfo(connectionId);
        
        // Get inbox details from database
        const inbox = await prisma.whatsAppConnection.findUnique({
            where: { id: connectionId },
            select: {
                displayName: true,
                phoneNumber: true,
                status: true
            }
        });
        
        return NextResponse.json({
            success: true,
            connectionId,
            status,
            qrCode,
            phoneNumber: info.phoneNumber || inbox?.phoneNumber,
            displayName: inbox?.displayName,
            isConnecting: status === 'connecting',
            isConnected: status === 'connected',
            hasQRCode: qrCode !== null
        });
    } catch (error) {
        console.error('Error getting status:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

