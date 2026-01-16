import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

export async function GET(request: NextRequest) {
    try {
        // TODO: Get user from session when auth is implemented
        // For now, get all connections
        
        const connections = await prisma.whatsAppConnection.findMany({
            include: {
                _count: {
                    select: {
                        numberAccess: true,
                        chats: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json({
            success: true,
            connections
        });
    } catch (error) {
        console.error('Error fetching connections:', error);
        return NextResponse.json({
            success: false,
            message: 'Erro ao buscar conexões',
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

