import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const connectionId = searchParams.get('connectionId');

        if (!connectionId) {
            return NextResponse.json({
                success: false,
                message: 'connectionId é obrigatório'
            }, { status: 400 });
        }

        const accesses = await prisma.numberAccess.findMany({
            where: {
                connectionId: parseInt(connectionId)
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                }
            },
            orderBy: {
                grantedAt: 'desc'
            }
        });

        return NextResponse.json({
            success: true,
            accesses
        });
    } catch (error) {
        console.error('Error fetching accesses:', error);
        return NextResponse.json({
            success: false,
            message: 'Erro ao buscar acessos',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

