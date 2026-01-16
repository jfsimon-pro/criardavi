"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    MoreVertical,
    Paperclip,
    Smile,
    Mic,
    Send,
    CheckCheck,
    QrCode,
    X,
    Wifi,
    WifiOff,
    Loader2,
    Trash2,
    Edit3
} from 'lucide-react';
import styles from './Chat.module.css';

interface InboxInterfaceProps {
    connectionId: number;
    title?: string;
}

interface Chat {
    id: string;
    name: string;
    lastMessage: string;
    timestamp: number;
    unreadCount: number;
    isGroup: boolean;
    isHumanTakeover: boolean;
    isClosed: boolean;
}

interface Message {
    id: string;
    fromMe: boolean;
    text: string;
    timestamp: number;
    status: number;
    hasMedia?: boolean;
    mediaType?: string | null;
    mediaUrl?: string | null;
    mediaMimeType?: string | null;
    mediaCaption?: string | null;
    audioTranscription?: string | null;
}

export default function InboxInterface({ connectionId, title }: InboxInterfaceProps) {
    const router = useRouter();
    const [activeFilter, setActiveFilter] = useState('Todas');
    const filters = ['Todas', 'Não Lidas', 'Humano', 'Concluídas'];

    // Connection states
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [showQRModal, setShowQRModal] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [inboxName, setInboxName] = useState(title || 'Inbox Free');
    const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

    // Chat data
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [qrTimeLeft, setQrTimeLeft] = useState(40);
    const [chatMenuOpen, setChatMenuOpen] = useState<string | null>(null);
    
    // Edit mode
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Poll connection status
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await fetch(`/api/baileys/inboxes/${connectionId}/status`);
                const data = await response.json();

                if (data.success) {
                    const previousStatus = connectionStatus;
                    setConnectionStatus(data.status);
                    setPhoneNumber(data.phoneNumber);
                    
                    if (data.displayName) {
                        setInboxName(data.displayName);
                    }
                    
                    if (previousStatus === 'connecting' && 
                        data.status === 'disconnected' && 
                        showQRModal) {
                        setTimeout(() => regenerateQRCode(), 1000);
                    }
                    
                    if (data.qrCode) {
                        setQrCode(data.qrCode);
                    }
                }
            } catch (error) {
                console.error('Error checking status:', error);
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 3000);

        return () => clearInterval(interval);
    }, [connectionId, connectionStatus, showQRModal]);

    // Fetch chats when connected
    useEffect(() => {
        if (connectionStatus !== 'connected') return;

        const fetchChats = async () => {
            try {
                const response = await fetch(`/api/baileys/inboxes/${connectionId}/chats`);
                const data = await response.json();

                if (data.success) {
                    setChats(data.chats);
                }
            } catch (error) {
                console.error('Error fetching chats:', error);
            }
        };

        fetchChats();
        const interval = setInterval(fetchChats, 5000);

        return () => clearInterval(interval);
    }, [connectionId, connectionStatus]);

    // Fetch messages when a chat is selected
    useEffect(() => {
        if (!selectedChat || connectionStatus !== 'connected') return;

        const fetchMessages = async () => {
            try {
                const response = await fetch(`/api/baileys/inboxes/${connectionId}/messages?chatId=${encodeURIComponent(selectedChat.id)}`);
                const data = await response.json();

                if (data.success) {
                    setMessages(data.messages);
                }
            } catch (error) {
                console.error('Error fetching messages:', error);
            }
        };

        fetchMessages();
        const interval = setInterval(fetchMessages, 2000);

        return () => clearInterval(interval);
    }, [connectionId, selectedChat, connectionStatus]);

    // QR Code countdown
    useEffect(() => {
        if (!qrCode || connectionStatus === 'connected') {
            setQrTimeLeft(40);
            return;
        }

        setQrTimeLeft(40);

        const timer = setInterval(() => {
            setQrTimeLeft((prev) => {
                if (prev <= 1) {
                    if (connectionStatus === 'connecting' && showQRModal) {
                        regenerateQRCode();
                    }
                    return 40;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [qrCode, connectionStatus, showQRModal]);

    // Auto-scroll messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Auto-close QR modal when connected
    useEffect(() => {
        if (connectionStatus === 'connected' && showQRModal) {
            setTimeout(() => setShowQRModal(false), 2000);
        }
    }, [connectionStatus, showQRModal]);

    // Close chat menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            if (chatMenuOpen) {
                setChatMenuOpen(null);
            }
        };
        
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [chatMenuOpen]);

    const handleConnect = async () => {
        setIsConnecting(true);
        setShowQRModal(true);
        setQrCode(null);

        try {
            const response = await fetch(`/api/baileys/inboxes/${connectionId}/connect`, {
                method: 'POST',
            });

            const data = await response.json();

            if (data.success && data.qrCode) {
                setQrCode(data.qrCode);
                setConnectionStatus('connecting');
            } else if (response.status === 202) {
                setConnectionStatus('connecting');
            }
        } catch (error) {
            console.error('Error connecting:', error);
            alert('Erro ao conectar. Tente novamente.');
        } finally {
            setIsConnecting(false);
        }
    };
    
    const regenerateQRCode = async () => {
        if (connectionStatus !== 'connecting' || !showQRModal) return;
        
        try {
            const response = await fetch(`/api/baileys/inboxes/${connectionId}/connect`, {
                method: 'POST',
            });

            const data = await response.json();

            if (data.success && data.qrCode) {
                setQrCode(data.qrCode);
                setQrTimeLeft(40);
            }
        } catch (error) {
            console.error('Error regenerating QR code:', error);
        }
    };

    const handleDisconnect = async () => {
        try {
            await fetch(`/api/baileys/inboxes/${connectionId}/disconnect`, {
                method: 'POST',
            });
            setConnectionStatus('disconnected');
            setQrCode(null);
            setChats([]);
            setSelectedChat(null);
            setMessages([]);
            setPhoneNumber(null);
        } catch (error) {
            console.error('Error disconnecting:', error);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Tem certeza que deseja excluir este inbox? Todas as conversas e mensagens serão perdidas.')) {
            return;
        }

        try {
            const response = await fetch(`/api/baileys/inboxes/${connectionId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                router.push('/atendente/inbox-pirata');
            } else {
                alert('Erro ao excluir inbox');
            }
        } catch (error) {
            console.error('Error deleting inbox:', error);
            alert('Erro ao excluir inbox');
        }
    };

    const handleUpdateName = async () => {
        if (!editName.trim()) return;

        try {
            const response = await fetch(`/api/baileys/inboxes/${connectionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ displayName: editName.trim() })
            });

            if (response.ok) {
                setInboxName(editName.trim());
                setIsEditing(false);
            }
        } catch (error) {
            console.error('Error updating name:', error);
        }
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim() || !selectedChat || isSending) return;

        setIsSending(true);

        try {
            const response = await fetch(`/api/baileys/inboxes/${connectionId}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: selectedChat.id,
                    text: messageInput.trim()
                })
            });

            const data = await response.json();

            if (data.success) {
                setMessageInput('');
                // Refresh messages
                const messagesResponse = await fetch(`/api/baileys/inboxes/${connectionId}/messages?chatId=${encodeURIComponent(selectedChat.id)}`);
                const messagesData = await messagesResponse.json();
                if (messagesData.success) {
                    setMessages(messagesData.messages);
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Erro ao enviar mensagem');
        } finally {
            setIsSending(false);
        }
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } else if (days === 1) {
            return 'Ontem';
        } else if (days < 7) {
            return date.toLocaleDateString('pt-BR', { weekday: 'long' });
        } else {
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        }
    };

    // Filter chats based on active filter
    const filteredChats = chats.filter(chat => {
        switch (activeFilter) {
            case 'Não Lidas':
                return chat.unreadCount > 0;
            case 'Humano':
                return chat.isHumanTakeover;
            case 'Concluídas':
                return chat.isClosed;
            default: // 'Todas'
                return true;
        }
    });

    // Update chat category
    const updateChatCategory = async (chatId: string, category: 'human' | 'closed' | 'open') => {
        try {
            const response = await fetch(`/api/baileys/inboxes/${connectionId}/chats`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId, category })
            });

            const data = await response.json();
            if (data.success) {
                // Update local state
                setChats(prevChats => prevChats.map(chat => 
                    chat.id === chatId 
                        ? { ...chat, isHumanTakeover: data.chat.isHumanTakeover, isClosed: data.chat.isClosed }
                        : chat
                ));
                // Also update selectedChat if it's the one being modified
                if (selectedChat?.id === chatId) {
                    setSelectedChat(prev => prev ? { 
                        ...prev, 
                        isHumanTakeover: data.chat.isHumanTakeover, 
                        isClosed: data.chat.isClosed 
                    } : null);
                }
            }
        } catch (error) {
            console.error('Error updating chat category:', error);
        }
        setChatMenuOpen(null);
    };

    const themeStyles = {
        '--theme-color': '#6366F1',
        '--theme-light-bg': '#EEF2FF',
        '--theme-chat-bubble': '#E0E7FF',
    } as React.CSSProperties;

    return (
        <div style={themeStyles} className={styles.wrapper}>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                style={{
                                    fontSize: '1.5rem',
                                    fontWeight: 700,
                                    border: '2px solid #6366F1',
                                    borderRadius: 8,
                                    padding: '4px 12px',
                                    outline: 'none'
                                }}
                                onKeyPress={(e) => e.key === 'Enter' && handleUpdateName()}
                                autoFocus
                            />
                            <button
                                onClick={handleUpdateName}
                                style={{
                                    background: '#6366F1',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 6,
                                    padding: '8px 12px',
                                    cursor: 'pointer'
                                }}
                            >
                                Salvar
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                style={{
                                    background: '#E5E7EB',
                                    color: '#374151',
                                    border: 'none',
                                    borderRadius: 6,
                                    padding: '8px 12px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancelar
                            </button>
                        </div>
                    ) : (
                        <>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{inboxName}</h1>
                            <button
                                onClick={() => { setEditName(inboxName); setIsEditing(true); }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#64748B',
                                    padding: 4
                                }}
                                title="Editar nome"
                            >
                                <Edit3 size={16} />
                            </button>
                        </>
                    )}
                    
                    <span style={{
                        fontSize: '0.75rem',
                        padding: '4px 8px',
                        borderRadius: 4,
                        backgroundColor: '#E0E7FF',
                        color: '#3730A3',
                        fontWeight: 600,
                        border: '1px solid #C7D2FE'
                    }}>
                        {phoneNumber ? `📱 ${phoneNumber}` : 'Conexão Via QR Code'}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Status Indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {connectionStatus === 'connected' ? (
                            <>
                                <Wifi size={16} color="#10B981" />
                                <span style={{ fontSize: '0.875rem', color: '#10B981', fontWeight: 500 }}>Conectado</span>
                            </>
                        ) : connectionStatus === 'connecting' ? (
                            <>
                                <Loader2 size={16} color="#F59E0B" className={styles.spin} />
                                <span style={{ fontSize: '0.875rem', color: '#F59E0B', fontWeight: 500 }}>Conectando...</span>
                            </>
                        ) : (
                            <>
                                <WifiOff size={16} color="#EF4444" />
                                <span style={{ fontSize: '0.875rem', color: '#EF4444', fontWeight: 500 }}>Desconectado</span>
                            </>
                        )}
                    </div>

                    {/* Connect/Disconnect Button */}
                    {connectionStatus === 'connected' ? (
                        <button
                            onClick={handleDisconnect}
                            className={styles.connectionButton}
                            style={{ backgroundColor: '#EF4444' }}
                        >
                            Desconectar
                        </button>
                    ) : (
                        <button
                            onClick={handleConnect}
                            disabled={isConnecting}
                            className={styles.connectionButton}
                            style={{ backgroundColor: '#6366F1' }}
                        >
                            <QrCode size={18} />
                            {isConnecting ? 'Conectando...' : 'Conectar WhatsApp'}
                        </button>
                    )}

                    {/* Delete Button */}
                    <button
                        onClick={handleDelete}
                        style={{
                            background: 'none',
                            border: '1px solid #FCA5A5',
                            color: '#EF4444',
                            borderRadius: 8,
                            padding: '8px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                        title="Excluir inbox"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div className={styles.chatContainer}>
                {/* Sidebar */}
                <div className={styles.contactSidebar}>
                    <div className={styles.sidebarHeader}>
                        <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(inboxName)}&background=6366F1&color=fff`}
                            className={styles.avatar}
                            style={{ width: 40, height: 40 }}
                        />
                        <div style={{ display: 'flex', gap: 16, color: '#64748B' }}>
                            <MoreVertical size={20} />
                        </div>
                    </div>

                    {connectionStatus === 'connected' && (
                        <div style={{ padding: '12px 16px', backgroundColor: '#ECFDF5', borderBottom: '1px solid #E5E7EB' }}>
                            <p style={{ fontSize: '0.75rem', color: '#059669', margin: 0 }}>
                                ✓ WhatsApp conectado {phoneNumber && `- ${phoneNumber}`}
                            </p>
                        </div>
                    )}

                    <div className={styles.searchBar}>
                        <div className={styles.searchWrapper}>
                            <Search size={16} className={styles.searchIcon} />
                            <input type="text" placeholder="Pesquisar..." className={styles.searchInput} />
                        </div>
                    </div>

                    <div className={styles.filterTabs}>
                        {filters.map(filter => (
                            <div
                                key={filter}
                                className={`${styles.filterTab} ${activeFilter === filter ? styles.active : ''}`}
                                onClick={() => setActiveFilter(filter)}
                            >
                                {filter}
                            </div>
                        ))}
                    </div>

                    <div className={styles.contactList}>
                        {filteredChats.length > 0 ? (
                            filteredChats.map((chat) => (
                                <div 
                                    key={chat.id} 
                                    className={`${styles.contactItem} ${selectedChat?.id === chat.id ? styles.active : ''}`}
                                    onClick={() => setSelectedChat(chat)}
                                    style={{ cursor: 'pointer', position: 'relative' }}
                                >
                                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=random`} className={styles.avatar} />
                                    <div className={styles.contactInfo}>
                                        <div className={styles.contactName}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {chat.name}
                                                {chat.isHumanTakeover && (
                                                    <span style={{ 
                                                        fontSize: '0.65rem', 
                                                        background: '#FEF3C7', 
                                                        color: '#92400E',
                                                        padding: '2px 6px',
                                                        borderRadius: 4,
                                                        fontWeight: 600
                                                    }}>👤 Humano</span>
                                                )}
                                                {chat.isClosed && (
                                                    <span style={{ 
                                                        fontSize: '0.65rem', 
                                                        background: '#DCFCE7', 
                                                        color: '#166534',
                                                        padding: '2px 6px',
                                                        borderRadius: 4,
                                                        fontWeight: 600
                                                    }}>✓ Concluída</span>
                                                )}
                                            </span>
                                            <span className={styles.lastMsgTime}>{formatTime(chat.timestamp)}</span>
                                        </div>
                                        <div className={styles.lastMsg}>
                                            {chat.lastMessage}
                                        </div>
                                    </div>
                                    
                                    {/* Unread badge */}
                                    {chat.unreadCount > 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            right: 40,
                                            bottom: 16,
                                            backgroundColor: '#10B981',
                                            color: 'white',
                                            borderRadius: '50%',
                                            width: 20,
                                            height: 20,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.75rem',
                                            fontWeight: 600
                                        }}>
                                            {chat.unreadCount}
                                        </div>
                                    )}

                                    {/* Three dots menu */}
                                    <div 
                                        style={{ 
                                            position: 'absolute',
                                            right: 8,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setChatMenuOpen(chatMenuOpen === chat.id ? null : chat.id);
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: 4,
                                                borderRadius: 4,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#64748B',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                        >
                                            <MoreVertical size={16} />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {chatMenuOpen === chat.id && (
                                            <div style={{
                                                position: 'absolute',
                                                right: 0,
                                                top: '100%',
                                                backgroundColor: 'white',
                                                borderRadius: 8,
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                minWidth: 160,
                                                zIndex: 100,
                                                overflow: 'hidden',
                                                border: '1px solid #E5E7EB'
                                            }}>
                                                {!chat.isHumanTakeover && !chat.isClosed && (
                                                    <button
                                                        onClick={() => updateChatCategory(chat.id, 'human')}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 14px',
                                                            border: 'none',
                                                            background: 'none',
                                                            cursor: 'pointer',
                                                            textAlign: 'left',
                                                            fontSize: '0.875rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 8,
                                                            color: '#1E293B',
                                                            transition: 'background 0.2s'
                                                        }}
                                                        onMouseOver={(e) => e.currentTarget.style.background = '#F1F5F9'}
                                                        onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                                    >
                                                        👤 Mover para Humano
                                                    </button>
                                                )}
                                                {!chat.isClosed && (
                                                    <button
                                                        onClick={() => updateChatCategory(chat.id, 'closed')}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 14px',
                                                            border: 'none',
                                                            background: 'none',
                                                            cursor: 'pointer',
                                                            textAlign: 'left',
                                                            fontSize: '0.875rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 8,
                                                            color: '#1E293B',
                                                            transition: 'background 0.2s'
                                                        }}
                                                        onMouseOver={(e) => e.currentTarget.style.background = '#F1F5F9'}
                                                        onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                                    >
                                                        ✓ Marcar como Concluída
                                                    </button>
                                                )}
                                                {(chat.isHumanTakeover || chat.isClosed) && (
                                                    <button
                                                        onClick={() => updateChatCategory(chat.id, 'open')}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 14px',
                                                            border: 'none',
                                                            background: 'none',
                                                            cursor: 'pointer',
                                                            textAlign: 'left',
                                                            fontSize: '0.875rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 8,
                                                            color: '#1E293B',
                                                            transition: 'background 0.2s'
                                                        }}
                                                        onMouseOver={(e) => e.currentTarget.style.background = '#F1F5F9'}
                                                        onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                                    >
                                                        🔄 Reabrir Conversa
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>
                                {connectionStatus === 'connected' 
                                    ? (chats.length > 0 
                                        ? `Nenhuma conversa na aba "${activeFilter}"`
                                        : 'Nenhuma conversa ainda. Envie uma mensagem para alguém!')
                                    : 'Conecte seu WhatsApp para ver as conversas'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Window */}
                <div className={`${styles.chatArea} ${styles.themePirata}`}>
                    {selectedChat ? (
                        <>
                            <div className={styles.chatHeader}>
                                <div className={styles.headerProfile}>
                                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChat.name)}&background=random`} className={styles.avatar} style={{ width: 40, height: 40 }} />
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{selectedChat.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                                            {selectedChat.isGroup ? 'Grupo' : 'Contato'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 20, color: '#64748B' }}>
                                    <Search size={20} />
                                    <MoreVertical size={20} />
                                </div>
                            </div>

                            <div className={styles.messagesScroll}>
                                {messages.length > 0 ? (
                                    <>
                                        {messages.map((msg) => (
                                            <div 
                                                key={msg.id} 
                                                className={`${styles.messageBubble} ${msg.fromMe ? styles.msgOut : styles.msgIn}`}
                                            >
                                                {/* Media content */}
                                                {msg.hasMedia && msg.mediaUrl && (
                                                    <div className={styles.mediaContainer}>
                                                        {msg.mediaType === 'image' && (
                                                            <img 
                                                                src={msg.mediaUrl} 
                                                                alt="Imagem" 
                                                                className={styles.mediaImage}
                                                                onClick={() => window.open(msg.mediaUrl!, '_blank')}
                                                            />
                                                        )}
                                                        {msg.mediaType === 'video' && (
                                                            <video 
                                                                src={msg.mediaUrl} 
                                                                controls 
                                                                className={styles.mediaVideo}
                                                            />
                                                        )}
                                                        {msg.mediaType === 'audio' && (
                                                            <div className={styles.audioContainer}>
                                                                <audio 
                                                                    src={msg.mediaUrl} 
                                                                    controls 
                                                                    className={styles.mediaAudio}
                                                                />
                                                                {msg.audioTranscription && (
                                                                    <div className={styles.audioTranscription}>
                                                                        <span className={styles.transcriptionLabel}>📝 Transcrição:</span>
                                                                        <p>{msg.audioTranscription}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        {msg.mediaType === 'document' && (
                                                            <a 
                                                                href={msg.mediaUrl} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className={styles.mediaDocument}
                                                            >
                                                                📄 {msg.mediaCaption || 'Documento'}
                                                            </a>
                                                        )}
                                                        {msg.mediaType === 'sticker' && (
                                                            <img 
                                                                src={msg.mediaUrl} 
                                                                alt="Sticker" 
                                                                className={styles.mediaSticker}
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                                {msg.hasMedia && !msg.mediaUrl && (
                                                    <div className={styles.mediaPending}>
                                                        {msg.mediaType === 'image' && '🖼️ Imagem'}
                                                        {msg.mediaType === 'video' && '🎥 Vídeo'}
                                                        {msg.mediaType === 'audio' && '🎵 Áudio'}
                                                        {msg.mediaType === 'document' && '📄 Documento'}
                                                        {msg.mediaType === 'sticker' && '😊 Sticker'}
                                                        {!msg.mediaType && '📎 Mídia'}
                                                    </div>
                                                )}
                                                {/* Text content */}
                                                {msg.text && <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>}
                                                {/* Caption for media */}
                                                {msg.hasMedia && msg.mediaCaption && msg.mediaType !== 'document' && (
                                                    <div className={styles.mediaCaption}>{msg.mediaCaption}</div>
                                                )}
                                                <span className={styles.msgTime}>
                                                    {formatTime(msg.timestamp)}
                                                    {msg.fromMe && (
                                                        <CheckCheck size={12} style={{ marginLeft: 4, color: msg.status >= 3 ? '#34B7F1' : '#64748B' }} />
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </>
                                ) : (
                                    <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        height: '100%',
                                        color: '#64748B',
                                        textAlign: 'center',
                                        padding: 24
                                    }}>
                                        Nenhuma mensagem nesta conversa ainda.
                                    </div>
                                )}
                            </div>

                            <div className={styles.inputArea}>
                                <Smile size={24} color="#64748B" />
                                <Paperclip size={24} color="#64748B" />
                                <textarea 
                                    placeholder="Mensagem (Enter para enviar, Shift+Enter para quebrar linha)" 
                                    className={styles.inputField}
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    disabled={connectionStatus !== 'connected'}
                                    rows={1}
                                    style={{ 
                                        resize: 'none',
                                        minHeight: '44px',
                                        maxHeight: '120px',
                                        overflowY: 'auto'
                                    }}
                                />
                                <Mic size={24} color="#64748B" />
                                <button 
                                    className={styles.sendBtn}
                                    onClick={handleSendMessage}
                                    disabled={!messageInput.trim() || isSending || connectionStatus !== 'connected'}
                                >
                                    {isSending ? <Loader2 size={20} className={styles.spin} /> : <Send size={20} />}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            height: '100%',
                            color: '#64748B',
                            gap: 16
                        }}>
                            <Wifi size={64} strokeWidth={1} />
                            <div style={{ textAlign: 'center' }}>
                                <h3 style={{ margin: '0 0 8px 0' }}>Selecione uma conversa</h3>
                                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                                    Escolha uma conversa à esquerda para começar a conversar
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* QR Code Modal */}
            {showQRModal && (
                <div className={styles.modalOverlay} onClick={() => setShowQRModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Conectar WhatsApp - {inboxName}</h2>
                            <button
                                onClick={() => setShowQRModal(false)}
                                className={styles.closeButton}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            {connectionStatus === 'connected' ? (
                                <div className={styles.successMessage}>
                                    <Wifi size={48} color="#10B981" />
                                    <h3>Conectado com sucesso!</h3>
                                    <p>Seu WhatsApp está conectado e pronto para usar.</p>
                                </div>
                            ) : qrCode ? (
                                <div className={styles.qrCodeContainer}>
                                    <p className={styles.instructions}>
                                        1. Abra o WhatsApp no seu celular<br />
                                        2. Toque em <strong>Menu</strong> ou <strong>Configurações</strong><br />
                                        3. Toque em <strong>Aparelhos conectados</strong><br />
                                        4. Toque em <strong>Conectar um aparelho</strong><br />
                                        5. Aponte seu celular para esta tela para capturar o código
                                    </p>
                                    <div style={{ position: 'relative' }}>
                                        <img
                                            src={qrCode}
                                            alt="QR Code"
                                            className={styles.qrCodeImage}
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            top: -10,
                                            right: -10,
                                            backgroundColor: qrTimeLeft < 15 ? '#EF4444' : '#6366F1',
                                            color: 'white',
                                            borderRadius: '50%',
                                            width: 56,
                                            height: 56,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.875rem',
                                            fontWeight: 700,
                                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                        }}>
                                            <div>{qrTimeLeft}s</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={regenerateQRCode}
                                        style={{
                                            marginTop: '16px',
                                            padding: '10px 20px',
                                            background: '#6366F1',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            fontSize: '0.875rem',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = '#4F46E5'}
                                        onMouseOut={(e) => e.currentTarget.style.background = '#6366F1'}
                                    >
                                        🔄 Gerar Novo QR Code
                                    </button>
                                    <p className={styles.qrCodeNote}>
                                        O código é renovado automaticamente a cada 40 segundos.
                                    </p>
                                </div>
                            ) : (
                                <div className={styles.loadingContainer}>
                                    <Loader2 size={48} className={styles.spin} color="#6366F1" />
                                    <p>Gerando QR Code...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

