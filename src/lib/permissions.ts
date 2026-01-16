import { prisma } from './prisma';
import { UserRole } from '@prisma/client';

/**
 * Verifica se um usuário tem acesso a uma conexão específica
 */
export async function userHasAccess(
    userId: number, 
    connectionId: number, 
    permission: 'read' | 'write' | 'manage'
): Promise<boolean> {
    try {
        // Admins sempre têm acesso total
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (!user) return false;
        if (user.role === 'ADMIN') return true;

        // Verifica se tem NumberAccess
        const access = await prisma.numberAccess.findUnique({
            where: {
                userId_connectionId: {
                    userId,
                    connectionId
                }
            }
        });

        if (!access) return false;

        // Verifica permissão específica
        switch (permission) {
            case 'read':
                return access.canRead;
            case 'write':
                return access.canWrite;
            case 'manage':
                return access.canManage;
            default:
                return false;
        }
    } catch (error) {
        console.error('Error checking user access:', error);
        return false;
    }
}

/**
 * Lista todas as conexões que um usuário pode acessar
 */
export async function getUserConnections(userId: number, permission?: 'read' | 'write' | 'manage') {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (!user) return [];

        // Se é admin, retorna todas as conexões
        if (user.role === 'ADMIN') {
            return await prisma.whatsAppConnection.findMany({
                orderBy: { displayName: 'asc' }
            });
        }

        // Caso contrário, busca apenas as que tem acesso
        const accesses = await prisma.numberAccess.findMany({
            where: {
                userId,
                ...(permission === 'read' && { canRead: true }),
                ...(permission === 'write' && { canWrite: true }),
                ...(permission === 'manage' && { canManage: true }),
            },
            include: {
                connection: true
            }
        });

        return accesses.map(a => a.connection);
    } catch (error) {
        console.error('Error getting user connections:', error);
        return [];
    }
}

/**
 * Concede acesso a um número para um usuário
 */
export async function grantNumberAccess(
    userId: number,
    connectionId: number,
    permissions: {
        canRead?: boolean;
        canWrite?: boolean;
        canManage?: boolean;
    },
    grantedBy?: number
) {
    try {
        return await prisma.numberAccess.upsert({
            where: {
                userId_connectionId: {
                    userId,
                    connectionId
                }
            },
            update: {
                canRead: permissions.canRead ?? true,
                canWrite: permissions.canWrite ?? true,
                canManage: permissions.canManage ?? false,
            },
            create: {
                userId,
                connectionId,
                canRead: permissions.canRead ?? true,
                canWrite: permissions.canWrite ?? true,
                canManage: permissions.canManage ?? false,
                grantedBy,
            }
        });
    } catch (error) {
        console.error('Error granting number access:', error);
        throw error;
    }
}

/**
 * Remove acesso de um usuário a um número
 */
export async function revokeNumberAccess(userId: number, connectionId: number) {
    try {
        await prisma.numberAccess.delete({
            where: {
                userId_connectionId: {
                    userId,
                    connectionId
                }
            }
        });
    } catch (error) {
        console.error('Error revoking number access:', error);
        throw error;
    }
}

/**
 * Atribui um chat para um atendente
 */
export async function assignChat(chatId: string, agentId: number, assignedBy?: number) {
    try {
        const chat = await prisma.chat.update({
            where: { id: chatId },
            data: {
                assignedAgentId: agentId,
                assignedAt: new Date(),
                isHumanTakeover: true,
                isAIActive: false,
            }
        });

        // Registra participação
        await recordChatParticipation(chatId, agentId, 'AGENT');

        // Log de atividade
        await logActivity(
            'CHAT_ASSIGNED',
            assignedBy || agentId,
            'Chat',
            chatId,
            { assignedTo: agentId }
        );

        return chat;
    } catch (error) {
        console.error('Error assigning chat:', error);
        throw error;
    }
}

/**
 * Remove atribuição de um chat
 */
export async function unassignChat(chatId: string) {
    try {
        return await prisma.chat.update({
            where: { id: chatId },
            data: {
                assignedAgentId: null,
                assignedAt: null,
            }
        });
    } catch (error) {
        console.error('Error unassigning chat:', error);
        throw error;
    }
}

/**
 * Registra participação de um usuário em um chat
 */
export async function recordChatParticipation(
    chatId: string, 
    userId: number, 
    role: 'AGENT' | 'SUPERVISOR' | 'OBSERVER' = 'AGENT'
) {
    try {
        // Verifica se já existe participação ativa
        const existing = await prisma.chatParticipation.findUnique({
            where: {
                chatId_userId: {
                    chatId,
                    userId
                }
            }
        });

        if (existing && !existing.leftAt) {
            // Já está participando, não faz nada
            return existing;
        }

        // Cria nova participação
        return await prisma.chatParticipation.upsert({
            where: {
                chatId_userId: {
                    chatId,
                    userId
                }
            },
            update: {
                leftAt: null, // Reativa participação
                role,
            },
            create: {
                chatId,
                userId,
                role,
            }
        });
    } catch (error) {
        console.error('Error recording chat participation:', error);
        throw error;
    }
}

/**
 * Finaliza participação de um usuário em um chat
 */
export async function endChatParticipation(chatId: string, userId: number) {
    try {
        return await prisma.chatParticipation.update({
            where: {
                chatId_userId: {
                    chatId,
                    userId
                }
            },
            data: {
                leftAt: new Date()
            }
        });
    } catch (error) {
        console.error('Error ending chat participation:', error);
        throw error;
    }
}

/**
 * Registra uma atividade no log
 */
export async function logActivity(
    action: string,
    userId: number | null,
    entity: string,
    entityId: string | null,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string
) {
    try {
        let userName = null;
        let userRole = null;

        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { name: true, role: true }
            });

            if (user) {
                userName = user.name;
                userRole = user.role;
            }
        }

        return await prisma.activityLog.create({
            data: {
                userId,
                userName,
                userRole,
                action,
                entity,
                entityId,
                description: generateActivityDescription(action, userName, metadata),
                metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
                ipAddress,
                userAgent,
            }
        });
    } catch (error) {
        console.error('Error logging activity:', error);
        // Não lança erro para não interromper fluxo principal
    }
}

/**
 * Gera descrição legível para o log
 */
function generateActivityDescription(action: string, userName: string | null, metadata?: any): string {
    const user = userName || 'Sistema';
    
    switch (action) {
        case 'CHAT_ASSIGNED':
            return `${user} atribuiu o chat`;
        case 'CHAT_CLOSED':
            return `${user} finalizou o chat`;
        case 'MESSAGE_SENT':
            return `${user} enviou uma mensagem`;
        case 'CONNECTION_CREATED':
            return `${user} criou uma nova conexão`;
        case 'CONNECTION_CONNECTED':
            return `${user} conectou o número`;
        case 'CONNECTION_DISCONNECTED':
            return `${user} desconectou o número`;
        case 'ACCESS_GRANTED':
            return `${user} concedeu acesso`;
        case 'ACCESS_REVOKED':
            return `${user} revogou acesso`;
        default:
            return `${user} realizou ${action}`;
    }
}

/**
 * Atualiza estatísticas de um usuário
 */
export async function updateUserStats(userId: number, updates: {
    messagesSent?: number;
    messagesReceived?: number;
    chatsHandled?: number;
    activeChats?: number;
    closedChats?: number;
}) {
    try {
        const existing = await prisma.userStats.findUnique({
            where: { userId }
        });

        if (existing) {
            return await prisma.userStats.update({
                where: { userId },
                data: {
                    totalMessagesSent: updates.messagesSent 
                        ? { increment: updates.messagesSent } 
                        : undefined,
                    totalMessagesReceived: updates.messagesReceived 
                        ? { increment: updates.messagesReceived } 
                        : undefined,
                    totalChatsHandled: updates.chatsHandled 
                        ? { increment: updates.chatsHandled } 
                        : undefined,
                    activeChats: updates.activeChats ?? undefined,
                    closedChats: updates.closedChats 
                        ? { increment: updates.closedChats } 
                        : undefined,
                    lastActiveAt: new Date(),
                }
            });
        } else {
            return await prisma.userStats.create({
                data: {
                    userId,
                    totalMessagesSent: updates.messagesSent || 0,
                    totalMessagesReceived: updates.messagesReceived || 0,
                    totalChatsHandled: updates.chatsHandled || 0,
                    activeChats: updates.activeChats || 0,
                    closedChats: updates.closedChats || 0,
                    lastActiveAt: new Date(),
                }
            });
        }
    } catch (error) {
        console.error('Error updating user stats:', error);
    }
}

