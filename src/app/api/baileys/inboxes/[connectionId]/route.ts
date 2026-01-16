import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteInbox, updateInboxName, getConnectionStatus, getQRCode, getConnectionInfo } from '@/lib/baileys-server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ connectionId: string }>;
}

/**
 * GET /api/baileys/inboxes/[connectionId]
 * Retorna detalhes de um inbox específico
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
        
        // Get inbox from database
        const inbox = await prisma.whatsAppConnection.findUnique({
            where: { id: connectionId },
            select: {
                id: true,
                displayName: true,
                phoneNumber: true,
                status: true,
                lastConnectedAt: true,
                createdByUserId: true,
                createdBy: {
                    select: { name: true }
                }
            }
        });
        
        if (!inbox) {
            return NextResponse.json(
                { success: false, error: 'Inbox not found' },
                { status: 404 }
            );
        }
        
        // Get live status
        const liveStatus = getConnectionStatus(connectionId);
        const qrCode = getQRCode(connectionId);
        const info = getConnectionInfo(connectionId);
        
        return NextResponse.json({
            success: true,
            inbox: {
                ...inbox,
                liveStatus,
                qrCode,
                isConnecting: liveStatus === 'connecting',
                hasQRCode: qrCode !== null
            }
        });
    } catch (error) {
        console.error('Error getting inbox:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/baileys/inboxes/[connectionId]
 * Atualiza o nome do inbox
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
        const body = await request.json();
        
        if (body.displayName) {
            await updateInboxName(connectionId, userId, body.displayName);
        }
        
        return NextResponse.json({
            success: true,
            message: 'Inbox updated successfully'
        });
    } catch (error: any) {
        if (error.message === 'Permission denied') {
            return NextResponse.json(
                { success: false, error: 'Permission denied' },
                { status: 403 }
            );
        }
        console.error('Error updating inbox:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/baileys/inboxes/[connectionId]
 * Deleta um inbox
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
        
        await deleteInbox(connectionId, userId);
        
        return NextResponse.json({
            success: true,
            message: 'Inbox deleted successfully'
        });
    } catch (error: any) {
        if (error.message === 'Permission denied') {
            return NextResponse.json(
                { success: false, error: 'Permission denied' },
                { status: 403 }
            );
        }
        console.error('Error deleting inbox:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

