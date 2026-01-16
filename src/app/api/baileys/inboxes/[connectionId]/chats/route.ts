import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getChats } from '@/lib/baileys-server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ connectionId: string }>;
}

/**
 * GET /api/baileys/inboxes/[connectionId]/chats
 * Retorna os chats de um inbox específico
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
        
        const chats = await getChats(connectionId, userId);
        
        return NextResponse.json({
            success: true,
            chats
        });
    } catch (error) {
        console.error('Error getting chats:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/baileys/inboxes/[connectionId]/chats
 * Atualiza a categoria/status de um chat
 * Body: { chatId: string, category: 'human' | 'closed' | 'open' }
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
        const { chatId, category } = body;
        
        if (!chatId || !category) {
            return NextResponse.json(
                { success: false, error: 'chatId and category are required' },
                { status: 400 }
            );
        }
        
        // Check access
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });
        
        if (user?.role !== 'ADMIN') {
            const access = await prisma.numberAccess.findFirst({
                where: { userId, connectionId, canWrite: true }
            });
            
            if (!access) {
                return NextResponse.json(
                    { success: false, error: 'Access denied' },
                    { status: 403 }
                );
            }
        }
        
        // Verify chat belongs to this connection
        const chat = await prisma.chat.findFirst({
            where: { id: chatId, connectionId }
        });
        
        if (!chat) {
            return NextResponse.json(
                { success: false, error: 'Chat not found' },
                { status: 404 }
            );
        }
        
        // Update based on category
        let updateData: { isHumanTakeover?: boolean; isClosed?: boolean; closedAt?: Date | null; isAIActive?: boolean } = {};
        
        switch (category) {
            case 'human':
                // Move to Human (handoff) - disable AI
                updateData = { isHumanTakeover: true, isClosed: false, closedAt: null, isAIActive: false };
                break;
            case 'closed':
                // Move to Closed - disable AI
                updateData = { isClosed: true, closedAt: new Date(), isAIActive: false };
                break;
            case 'open':
                // Reopen - back to normal, REACTIVATE AI
                updateData = { isHumanTakeover: false, isClosed: false, closedAt: null, isAIActive: true };
                break;
            default:
                return NextResponse.json(
                    { success: false, error: 'Invalid category. Use: human, closed, or open' },
                    { status: 400 }
                );
        }
        
        const updatedChat = await prisma.chat.update({
            where: { id: chatId },
            data: updateData
        });
        
        console.log(`✅ Chat ${chatId} moved to category: ${category}`);
        
        return NextResponse.json({
            success: true,
            chat: {
                id: updatedChat.id,
                isHumanTakeover: updatedChat.isHumanTakeover,
                isClosed: updatedChat.isClosed
            }
        });
    } catch (error) {
        console.error('Error updating chat category:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

