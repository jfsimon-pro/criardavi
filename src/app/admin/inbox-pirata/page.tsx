'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar/Sidebar';
import TopBar from '@/components/TopBar/TopBar';
import styles from '@/app/admin/dashboard/Dashboard.module.css';
import { Plus, Wifi, WifiOff, Loader2, MessageCircle, Trash2 } from 'lucide-react';

interface Inbox {
    id: number;
    displayName: string;
    phoneNumber: string | null;
    status: string;
    liveStatus: string;
    isConnecting: boolean;
    hasQRCode: boolean;
    lastConnectedAt: string | null;
    createdBy: { name: string };
}

export default function AdminInboxPirataListPage() {
    const router = useRouter();
    const [inboxes, setInboxes] = useState<Inbox[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    const fetchInboxes = async () => {
        try {
            const response = await fetch('/api/baileys/inboxes');
            const data = await response.json();
            if (data.success) {
                setInboxes(data.inboxes);
            }
        } catch (error) {
            console.error('Error fetching inboxes:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInboxes();
        const interval = setInterval(fetchInboxes, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleCreateInbox = async () => {
        setCreating(true);
        try {
            const response = await fetch('/api/baileys/inboxes', {
                method: 'POST',
            });
            const data = await response.json();
            if (data.success) {
                router.push(`/admin/inbox-pirata/${data.connectionId}`);
            }
        } catch (error) {
            console.error('Error creating inbox:', error);
            alert('Erro ao criar inbox');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteInbox = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Tem certeza que deseja excluir este inbox?')) return;

        try {
            const response = await fetch(`/api/baileys/inboxes/${id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                fetchInboxes();
            }
        } catch (error) {
            console.error('Error deleting inbox:', error);
        }
    };

    const getStatusIcon = (inbox: Inbox) => {
        if (inbox.liveStatus === 'connected') {
            return <Wifi size={20} color="#10B981" />;
        } else if (inbox.liveStatus === 'connecting' || inbox.isConnecting) {
            return <Loader2 size={20} color="#F59E0B" className="animate-spin" />;
        } else {
            return <WifiOff size={20} color="#EF4444" />;
        }
    };

    const getStatusText = (inbox: Inbox) => {
        if (inbox.liveStatus === 'connected') return 'Conectado';
        if (inbox.liveStatus === 'connecting' || inbox.isConnecting) return 'Conectando...';
        return 'Desconectado';
    };

    const getStatusColor = (inbox: Inbox) => {
        if (inbox.liveStatus === 'connected') return '#10B981';
        if (inbox.liveStatus === 'connecting' || inbox.isConnecting) return '#F59E0B';
        return '#EF4444';
    };

    return (
        <div className={styles.dashboardLayout}>
            <Sidebar variant="admin" />
            <main className={styles.mainContent}>
                <TopBar variant="admin" />
                
                <div style={{ padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <div>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Todos os Inboxes Free</h1>
                            <p style={{ color: '#64748B', margin: '8px 0 0 0' }}>
                                Gerencie todas as conexões WhatsApp via QR Code (Admin)
                            </p>
                        </div>
                        <button
                            onClick={handleCreateInbox}
                            disabled={creating}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '12px 24px',
                                background: '#6366F1',
                                color: 'white',
                                border: 'none',
                                borderRadius: 8,
                                fontWeight: 600,
                                cursor: creating ? 'not-allowed' : 'pointer',
                                opacity: creating ? 0.7 : 1
                            }}
                        >
                            {creating ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                            Criar Novo Inbox
                        </button>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 48 }}>
                            <Loader2 size={48} color="#6366F1" className="animate-spin" />
                            <p style={{ color: '#64748B', marginTop: 16 }}>Carregando inboxes...</p>
                        </div>
                    ) : inboxes.length === 0 ? (
                        <div style={{ 
                            textAlign: 'center', 
                            padding: 64,
                            background: '#F8FAFC',
                            borderRadius: 16,
                            border: '2px dashed #E2E8F0'
                        }}>
                            <MessageCircle size={64} color="#CBD5E1" strokeWidth={1} />
                            <h3 style={{ margin: '24px 0 8px 0', color: '#475569' }}>Nenhum inbox ainda</h3>
                            <p style={{ color: '#64748B', margin: '0 0 24px 0' }}>
                                Crie o primeiro inbox para conectar um WhatsApp
                            </p>
                            <button
                                onClick={handleCreateInbox}
                                disabled={creating}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '12px 24px',
                                    background: '#6366F1',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                <Plus size={20} />
                                Criar Primeiro Inbox
                            </button>
                        </div>
                    ) : (
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                            gap: 16 
                        }}>
                            {inboxes.map((inbox) => (
                                <div
                                    key={inbox.id}
                                    onClick={() => router.push(`/admin/inbox-pirata/${inbox.id}`)}
                                    style={{
                                        background: 'white',
                                        borderRadius: 12,
                                        padding: 20,
                                        border: '1px solid #E2E8F0',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        position: 'relative'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.borderColor = '#6366F1';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.15)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.borderColor = '#E2E8F0';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: 12,
                                                background: '#EEF2FF',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <MessageCircle size={24} color="#6366F1" />
                                            </div>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                                                    {inbox.displayName}
                                                </h3>
                                                <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#64748B' }}>
                                                    {inbox.phoneNumber || 'Não conectado'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteInbox(inbox.id, e)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#94A3B8',
                                                padding: 4
                                            }}
                                            title="Excluir inbox"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: 8,
                                        marginTop: 16,
                                        padding: '8px 12px',
                                        background: inbox.liveStatus === 'connected' ? '#ECFDF5' : 
                                                   inbox.liveStatus === 'connecting' ? '#FFFBEB' : '#FEF2F2',
                                        borderRadius: 8
                                    }}>
                                        {getStatusIcon(inbox)}
                                        <span style={{ 
                                            fontSize: '0.875rem', 
                                            fontWeight: 500,
                                            color: getStatusColor(inbox)
                                        }}>
                                            {getStatusText(inbox)}
                                        </span>
                                    </div>

                                    <p style={{ 
                                        margin: '12px 0 0 0', 
                                        fontSize: '0.75rem', 
                                        color: '#94A3B8' 
                                    }}>
                                        Criado por: {inbox.createdBy?.name || 'Desconhecido'}
                                    </p>

                                    {inbox.lastConnectedAt && (
                                        <p style={{ 
                                            margin: '4px 0 0 0', 
                                            fontSize: '0.75rem', 
                                            color: '#94A3B8' 
                                        }}>
                                            Última conexão: {new Date(inbox.lastConnectedAt).toLocaleString('pt-BR')}
                                        </p>
                                    )}
                                </div>
                            ))}

                            {/* Card para criar novo */}
                            <div
                                onClick={handleCreateInbox}
                                style={{
                                    background: '#F8FAFC',
                                    borderRadius: 12,
                                    padding: 20,
                                    border: '2px dashed #E2E8F0',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: 160,
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.borderColor = '#6366F1';
                                    e.currentTarget.style.background = '#EEF2FF';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.borderColor = '#E2E8F0';
                                    e.currentTarget.style.background = '#F8FAFC';
                                }}
                            >
                                <Plus size={32} color="#6366F1" />
                                <span style={{ marginTop: 8, fontWeight: 500, color: '#6366F1' }}>
                                    Adicionar Inbox
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
