"use client";

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar/Sidebar';
import TopBar from '@/components/TopBar/TopBar';
import styles from './ManageConnections.module.css';
import { Wifi, WifiOff, Users, Settings, Trash2, Plus, X, Check } from 'lucide-react';

interface Connection {
    id: number;
    phoneNumber: string;
    displayName: string;
    type: string;
    status: string;
    isShared: boolean;
    _count: {
        numberAccess: number;
        chats: number;
    };
}

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface Access {
    id: number;
    userId: number;
    canRead: boolean;
    canWrite: boolean;
    canManage: boolean;
    user: User;
}

export default function ManageConnectionsPage() {
    const [connections, setConnections] = useState<Connection[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
    const [accesses, setAccesses] = useState<Access[]>([]);
    const [showAccessModal, setShowAccessModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<number | null>(null);
    const [permissions, setPermissions] = useState({
        canRead: true,
        canWrite: true,
        canManage: false
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchConnections();
        fetchUsers();
    }, []);

    const fetchConnections = async () => {
        try {
            const response = await fetch('/api/connections/list');
            const data = await response.json();
            if (data.success) {
                setConnections(data.connections);
            }
        } catch (error) {
            console.error('Error fetching connections:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users/list');
            const data = await response.json();
            if (data.success) {
                setUsers(data.users.filter((u: User) => u.role === 'ATENDENTE'));
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchAccesses = async (connectionId: number) => {
        try {
            const response = await fetch(`/api/connections/accesses?connectionId=${connectionId}`);
            const data = await response.json();
            if (data.success) {
                setAccesses(data.accesses);
            }
        } catch (error) {
            console.error('Error fetching accesses:', error);
        }
    };

    const handleSelectConnection = (connection: Connection) => {
        setSelectedConnection(connection);
        fetchAccesses(connection.id);
    };

    const handleGrantAccess = async () => {
        if (!selectedConnection || !selectedUser) return;

        setLoading(true);
        try {
            const response = await fetch('/api/connections/grant-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    connectionId: selectedConnection.id,
                    userId: selectedUser,
                    permissions
                })
            });

            const data = await response.json();
            if (data.success) {
                setShowAccessModal(false);
                setSelectedUser(null);
                setPermissions({ canRead: true, canWrite: true, canManage: false });
                fetchAccesses(selectedConnection.id);
                alert('Acesso concedido com sucesso!');
            } else {
                alert('Erro ao conceder acesso: ' + data.message);
            }
        } catch (error) {
            console.error('Error granting access:', error);
            alert('Erro ao conceder acesso');
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeAccess = async (accessId: number) => {
        if (!confirm('Tem certeza que deseja revogar este acesso?')) return;

        try {
            const response = await fetch('/api/connections/revoke-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessId })
            });

            const data = await response.json();
            if (data.success) {
                fetchAccesses(selectedConnection!.id);
                alert('Acesso revogado com sucesso!');
            } else {
                alert('Erro ao revogar acesso: ' + data.message);
            }
        } catch (error) {
            console.error('Error revoking access:', error);
            alert('Erro ao revogar acesso');
        }
    };

    return (
        <div className={`${styles.layout} theme-admin`}>
            <Sidebar variant="admin" />
            <main className={styles.mainContent}>
                <TopBar variant="admin" />
                
                <div className={styles.container}>
                    <div className={styles.header}>
                        <h1>Gerenciar Conexões e Acessos</h1>
                        <p>Controle quem tem acesso a cada número do WhatsApp</p>
                    </div>

                    <div className={styles.contentGrid}>
                        {/* Lista de Conexões */}
                        <div className={styles.connectionsList}>
                            <h2>Minhas Conexões</h2>
                            
                            {connections.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <Wifi size={48} strokeWidth={1} />
                                    <p>Nenhuma conexão ainda</p>
                                    <small>Conecte um WhatsApp em Inbox Pirata</small>
                                </div>
                            ) : (
                                connections.map((conn) => (
                                    <div
                                        key={conn.id}
                                        className={`${styles.connectionCard} ${selectedConnection?.id === conn.id ? styles.active : ''}`}
                                        onClick={() => handleSelectConnection(conn)}
                                    >
                                        <div className={styles.connectionIcon}>
                                            {conn.status === 'CONNECTED' ? (
                                                <Wifi size={24} color="#10B981" />
                                            ) : (
                                                <WifiOff size={24} color="#EF4444" />
                                            )}
                                        </div>
                                        
                                        <div className={styles.connectionInfo}>
                                            <h3>{conn.displayName}</h3>
                                            <p>{conn.phoneNumber}</p>
                                            <div className={styles.connectionMeta}>
                                                <span className={styles.badge}>
                                                    {conn.type === 'PIRATE' ? 'Baileys' : 'API Oficial'}
                                                </span>
                                                <span className={styles.meta}>
                                                    <Users size={14} /> {conn._count.numberAccess} acessos
                                                </span>
                                                <span className={styles.meta}>
                                                    💬 {conn._count.chats} chats
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className={`${styles.status} ${styles[conn.status.toLowerCase()]}`}>
                                            {conn.status === 'CONNECTED' ? 'Conectado' : 'Desconectado'}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Painel de Acessos */}
                        <div className={styles.accessPanel}>
                            {selectedConnection ? (
                                <>
                                    <div className={styles.panelHeader}>
                                        <div>
                                            <h2>Acessos: {selectedConnection.displayName}</h2>
                                            <p>{selectedConnection.phoneNumber}</p>
                                        </div>
                                        <button
                                            className={styles.addButton}
                                            onClick={() => setShowAccessModal(true)}
                                        >
                                            <Plus size={20} />
                                            Adicionar Atendente
                                        </button>
                                    </div>

                                    <div className={styles.accessList}>
                                        {accesses.length === 0 ? (
                                            <div className={styles.emptyAccess}>
                                                <Users size={48} strokeWidth={1} />
                                                <p>Nenhum atendente com acesso ainda</p>
                                                <button
                                                    className={styles.emptyButton}
                                                    onClick={() => setShowAccessModal(true)}
                                                >
                                                    Adicionar Primeiro Atendente
                                                </button>
                                            </div>
                                        ) : (
                                            accesses.map((access) => (
                                                <div key={access.id} className={styles.accessCard}>
                                                    <div className={styles.accessUser}>
                                                        <div className={styles.userAvatar}>
                                                            {access.user.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <h4>{access.user.name}</h4>
                                                            <p>{access.user.email}</p>
                                                        </div>
                                                    </div>

                                                    <div className={styles.permissions}>
                                                        <span className={access.canRead ? styles.permYes : styles.permNo}>
                                                            {access.canRead ? <Check size={14} /> : <X size={14} />}
                                                            Ver
                                                        </span>
                                                        <span className={access.canWrite ? styles.permYes : styles.permNo}>
                                                            {access.canWrite ? <Check size={14} /> : <X size={14} />}
                                                            Enviar
                                                        </span>
                                                        <span className={access.canManage ? styles.permYes : styles.permNo}>
                                                            {access.canManage ? <Check size={14} /> : <X size={14} />}
                                                            Gerenciar
                                                        </span>
                                                    </div>

                                                    <button
                                                        className={styles.revokeButton}
                                                        onClick={() => handleRevokeAccess(access.id)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className={styles.noSelection}>
                                    <Settings size={64} strokeWidth={1} />
                                    <h3>Selecione uma conexão</h3>
                                    <p>Escolha uma conexão à esquerda para gerenciar os acessos</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modal de Adicionar Acesso */}
                {showAccessModal && (
                    <div className={styles.modalOverlay} onClick={() => setShowAccessModal(false)}>
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.modalHeader}>
                                <h2>Conceder Acesso</h2>
                                <button onClick={() => setShowAccessModal(false)}>
                                    <X size={24} />
                                </button>
                            </div>

                            <div className={styles.modalBody}>
                                <div className={styles.formGroup}>
                                    <label>Selecione o Atendente</label>
                                    <select
                                        value={selectedUser || ''}
                                        onChange={(e) => setSelectedUser(Number(e.target.value))}
                                    >
                                        <option value="">Escolha um atendente...</option>
                                        {users.map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user.name} ({user.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>Permissões</label>
                                    <div className={styles.checkboxGroup}>
                                        <label className={styles.checkbox}>
                                            <input
                                                type="checkbox"
                                                checked={permissions.canRead}
                                                onChange={(e) => setPermissions({
                                                    ...permissions,
                                                    canRead: e.target.checked
                                                })}
                                            />
                                            <span>Ver conversas</span>
                                        </label>
                                        <label className={styles.checkbox}>
                                            <input
                                                type="checkbox"
                                                checked={permissions.canWrite}
                                                onChange={(e) => setPermissions({
                                                    ...permissions,
                                                    canWrite: e.target.checked
                                                })}
                                            />
                                            <span>Enviar mensagens</span>
                                        </label>
                                        <label className={styles.checkbox}>
                                            <input
                                                type="checkbox"
                                                checked={permissions.canManage}
                                                onChange={(e) => setPermissions({
                                                    ...permissions,
                                                    canManage: e.target.checked
                                                })}
                                            />
                                            <span>Conectar/Desconectar (avançado)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.modalFooter}>
                                <button
                                    className={styles.cancelButton}
                                    onClick={() => setShowAccessModal(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className={styles.confirmButton}
                                    onClick={handleGrantAccess}
                                    disabled={!selectedUser || loading}
                                >
                                    {loading ? 'Concedendo...' : 'Conceder Acesso'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

