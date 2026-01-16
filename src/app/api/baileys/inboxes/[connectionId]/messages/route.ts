import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getChatMessages } from '@/lib/baileys-server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ connectionId: string }>;
}

/**
 * GET /api/baileys/inboxes/[connectionId]/messages?chatId=xxx
 * Retorna as mensagens de um chat específico
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
        
        const { searchParams } = new URL(request.url);
        const chatId = searchParams.get('chatId');
        
        if (!chatId) {
            return NextResponse.json(
                { success: false, error: 'chatId is required' },
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
        
        const messages = await getChatMessages(chatId, connectionId);
        
        return NextResponse.json({
            success: true,
            messages
        });
    } catch (error) {
        console.error('Error getting messages:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

