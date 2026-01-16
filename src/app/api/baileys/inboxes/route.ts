import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createInboxSlot, getUserInboxes } from '@/lib/baileys-server';

/**
 * GET /api/baileys/inboxes
 * Lista todos os inboxes do usuário
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
        
        const userId = parseInt(session.user.id);
        const inboxes = await getUserInboxes(userId);
        
        return NextResponse.json({
            success: true,
            inboxes
        });
    } catch (error) {
        console.error('Error getting inboxes:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/baileys/inboxes
 * Cria um novo inbox slot
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }
        
        const userId = parseInt(session.user.id);
        
        // Parse body for optional display name
        let displayName: string | undefined;
        try {
            const body = await request.json();
            displayName = body.displayName;
        } catch {
            // No body, that's fine
        }
        
        const connectionId = await createInboxSlot(userId, displayName);
        
        return NextResponse.json({
            success: true,
            connectionId,
            message: 'Inbox created successfully'
        });
    } catch (error) {
        console.error('Error creating inbox:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

