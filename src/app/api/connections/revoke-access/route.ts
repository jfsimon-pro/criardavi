import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/permissions';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { accessId } = body;

        if (!accessId) {
            return NextResponse.json({
                success: false,
                message: 'accessId é obrigatório'
            }, { status: 400 });
        }

        // TODO: Get admin user from session
        const adminUserId = 1; // Placeholder

        // Get access info before deleting
        const access = await prisma.numberAccess.findUnique({
            where: { id: accessId },
            include: {
                user: { select: { name: true } },
                connection: { select: { displayName: true } }
            }
        });

        if (!access) {
            return NextResponse.json({
                success: false,
                message: 'Acesso não encontrado'
            }, { status: 404 });
        }

        // Delete access
        await prisma.numberAccess.delete({
            where: { id: accessId }
        });

        // Log activity
        await logActivity(
            'ACCESS_REVOKED',
            adminUserId,
            'NumberAccess',
            String(accessId),
            {
                userId: access.userId,
                userName: access.user.name,
                connectionId: access.connectionId,
                connectionName: access.connection.displayName
            }
        );

        return NextResponse.json({
            success: true,
            message: 'Acesso revogado com sucesso'
        });
    } catch (error) {
        console.error('Error revoking access:', error);
        return NextResponse.json({
            success: false,
            message: 'Erro ao revogar acesso',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

