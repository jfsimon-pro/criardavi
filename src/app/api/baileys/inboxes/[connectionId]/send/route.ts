import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendMessage } from '@/lib/baileys-server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ connectionId: string }>;
}

/**
 * POST /api/baileys/inboxes/[connectionId]/send
 * Envia uma mensagem
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
        const body = await request.json();
        const { chatId, text } = body;
        
        if (!chatId || !text) {
            return NextResponse.json(
                { success: false, error: 'chatId and text are required' },
                { status: 400 }
            );
        }
        
        // Check access (canWrite required)
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
                    { success: false, error: 'Permission denied' },
                    { status: 403 }
                );
            }
        }
        
        const result = await sendMessage(connectionId, userId, chatId, text);
        
        // 🤖 HUMAN TAKEOVER: When a human sends a message, automatically disable AI for this chat
        // This prevents the AI from responding after a human has taken over
        await prisma.chat.update({
            where: { id: chatId },
            data: {
                isHumanTakeover: true,
                isAIActive: false,
                assignedAgentId: userId,
                assignedAt: new Date()
            }
        });
        
        console.log(`👤 Human takeover: Chat ${chatId} - AI disabled, assigned to user ${userId}`);
        
        return NextResponse.json({
            success: true,
            message: 'Message sent',
            messageId: result?.key?.id
        });
    } catch (error: any) {
        console.error('Error sending message:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

