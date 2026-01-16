import { NextRequest, NextResponse } from 'next/server';
import { grantNumberAccess, logActivity } from '@/lib/permissions';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { connectionId, userId, permissions } = body;

        if (!connectionId || !userId || !permissions) {
            return NextResponse.json({
                success: false,
                message: 'Campos obrigatórios: connectionId, userId, permissions'
            }, { status: 400 });
        }

        // TODO: Get admin user from session
        const adminUserId = 1; // Placeholder

        await grantNumberAccess(
            userId,
            connectionId,
            permissions,
            adminUserId
        );

        return NextResponse.json({
            success: true,
            message: 'Acesso concedido com sucesso'
        });
    } catch (error) {
        console.error('Error granting access:', error);
        return NextResponse.json({
            success: false,
            message: 'Erro ao conceder acesso',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

