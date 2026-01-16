"use client";

import { useState, useEffect, useRef } from 'react';
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
    Loader2
} from 'lucide-react';
import styles from './Chat.module.css';

type ChatVariant = 'official' | 'pirate';

interface ChatInterfaceProps {
    variant: ChatVariant;
    title: string;
}

interface Chat {
    id: string;
    name: string;
    lastMessage: string;
    timestamp: number;
    unreadCount: number;
    isGroup: boolean;
}

interface Message {
    id: string;
    fromMe: boolean;
    text: string;
    timestamp: number;
    status: number;
}

export default function ChatInterface({ variant, title }: ChatInterfaceProps) {
    const [activeFilter, setActiveFilter] = useState('Todas');
    const filters = ['Todas', 'Não Lidas', 'Humano', 'Concluídas'];

    // Baileys connection states
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [showQRModal, setShowQRModal] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    // Real chat data
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [qrTimeLeft, setQrTimeLeft] = useState(120); // 2 minutes in seconds
    
    // Ref for messages scroll
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Poll connection status for pirate variant
    useEffect(() => {
        if (variant !== 'pirate') return;

        const checkStatus = async () => {
            try {
                const response = await fetch('/api/baileys/status');
                const data = await response.json();

                if (data.success) {
                    const previousStatus = connectionStatus;
                    setConnectionStatus(data.status);
                    
                    // Se estava connecting mas agora está disconnected (QR expirou)
                    // E o modal ainda está aberto, regenera automaticamente
                    if (previousStatus === 'connecting' && 
                        data.status === 'disconnected' && 
                        showQRModal) {
                        console.log('Connection dropped (QR expired), regenerating...');
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

        // Check immediately
        checkStatus();

        // Poll every 3 seconds
        const interval = setInterval(checkStatus, 3000);

        return () => clearInterval(interval);
    }, [variant, connectionStatus, showQRModal]);

    // Fetch chats when connected (pirate variant only)
    useEffect(() => {
        if (variant !== 'pirate' || connectionStatus !== 'connected') return;

        const fetchChats = async () => {
            try {
                const response = await fetch('/api/baileys/chats');
                const data = await response.json();

                if (data.success) {
                    setChats(data.chats);
                }
            } catch (error) {
                console.error('Error fetching chats:', error);
            }
        };

        // Fetch immediately
        fetchChats();

        // Poll every 5 seconds for new chats
        const interval = setInterval(fetchChats, 5000);

        return () => clearInterval(interval);
    }, [variant, connectionStatus]);

    // Fetch messages when a chat is selected
    useEffect(() => {
        if (variant !== 'pirate' || !selectedChat || connectionStatus !== 'connected') return;

        const fetchMessages = async () => {
            try {
                const response = await fetch(`/api/baileys/messages?chatId=${encodeURIComponent(selectedChat.id)}`);
                const data = await response.json();

                if (data.success) {
                    setMessages(data.messages);
                }
            } catch (error) {
                console.error('Error fetching messages:', error);
            }
        };

        // Fetch immediately
        fetchMessages();

        // Poll every 2 seconds for new messages
        const interval = setInterval(fetchMessages, 2000);

        return () => clearInterval(interval);
    }, [variant, selectedChat, connectionStatus]);

    // QR Code countdown timer with auto-regeneration
    useEffect(() => {
        if (!qrCode || connectionStatus === 'connected') {
            setQrTimeLeft(40); // Baileys QR expires in ~40 seconds
            return;
        }

        setQrTimeLeft(40); // Start countdown from 40 seconds

        const timer = setInterval(() => {
            setQrTimeLeft((prev) => {
                if (prev <= 1) {
                    // QR code expired, regenerate if still connecting
                    if (connectionStatus === 'connecting' && showQRModal) {
                        console.log('QR code expired, regenerating...');
                        regenerateQRCode();
                    }
                    return 40;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [qrCode, connectionStatus, showQRModal]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Auto-close QR modal when connected
    useEffect(() => {
        if (connectionStatus === 'connected' && showQRModal) {
            // Wait 2 seconds to show success message, then close
            setTimeout(() => {
                setShowQRModal(false);
            }, 2000);
        }
    }, [connectionStatus, showQRModal]);

    // Handle connect button click
    const handleConnect = async () => {
        setIsConnecting(true);
        setShowQRModal(true);
        setQrCode(null); // Clear old QR code

        try {
            const response = await fetch('/api/baileys/connect', {
                method: 'POST',
            });

            const data = await response.json();

            if (data.success && data.qrCode) {
                setQrCode(data.qrCode);
                setConnectionStatus('connecting');
            } else if (response.status === 202) {
                // QR code is being generated, will be available via polling
                setConnectionStatus('connecting');
            }
        } catch (error) {
            console.error('Error connecting:', error);
            alert('Erro ao conectar. Tente novamente.');
        } finally {
            setIsConnecting(false);
        }
    };
    
    // Regenerate QR code if needed
    const regenerateQRCode = async () => {
        if (connectionStatus !== 'connecting' || !showQRModal) return;
        
        try {
            const response = await fetch('/api/baileys/connect', {
                method: 'POST',
            });

            const data = await response.json();

            if (data.success && data.qrCode) {
                setQrCode(data.qrCode);
                setQrTimeLeft(120); // Reset timer
            }
        } catch (error) {
            console.error('Error regenerating QR code:', error);
        }
    };

    // Handle disconnect
    const handleDisconnect = async () => {
        try {
            await fetch('/api/baileys/disconnect', {
                method: 'POST',
            });
            setConnectionStatus('disconnected');
            setQrCode(null);
            setChats([]);
            setSelectedChat(null);
            setMessages([]);
        } catch (error) {
            console.error('Error disconnecting:', error);
        }
    };

    // Handle send message
    const handleSendMessage = async () => {
        if (!messageInput.trim() || !selectedChat || isSending) return;

        setIsSending(true);

        try {
            const response = await fetch('/api/baileys/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: selectedChat.id,
                    message: messageInput.trim()
                })
            });

            const data = await response.json();

            if (data.success) {
                setMessageInput('');
                // Refresh messages immediately
                const messagesResponse = await fetch(`/api/baileys/messages?chatId=${encodeURIComponent(selectedChat.id)}`);
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

    // Format timestamp
    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } else if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return date.toLocaleDateString('pt-BR', { weekday: 'long' });
        } else {
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        }
    };

    // Theme Variables Map
    const themeStyles = {
        '--theme-color': variant === 'official' ? '#10B981' : '#6366F1', // Green vs Indigo
        '--theme-light-bg': variant === 'official' ? '#ECFDF5' : '#EEF2FF',
        '--theme-chat-bubble': variant === 'official' ? '#D1FAE5' : '#E0E7FF',
    } as React.CSSProperties;

    // For official variant, use mock data
    const mockContacts = variant === 'official' ? [
        { id: '1', name: 'Cliente 1', lastMessage: 'Gostaria de orçamento...', timestamp: Date.now() - 3600000, unreadCount: 0, isGroup: false },
        { id: '2', name: 'Cliente 2', lastMessage: 'Obrigado pelo retorno!', timestamp: Date.now() - 7200000, unreadCount: 2, isGroup: false },
        { id: '3', name: 'Cliente 3', lastMessage: 'Meu pedido atrasou.', timestamp: Date.now() - 86400000, unreadCount: 0, isGroup: false },
    ] : [];

    // Use real chats for pirate variant, mock for official
    const displayChats = variant === 'pirate' ? chats : mockContacts;

    return (
        <div style={themeStyles} className={styles.wrapper}>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{title}</h1>
                    <span style={{
                        fontSize: '0.75rem',
                        padding: '4px 8px',
                        borderRadius: 4,
                        backgroundColor: variant === 'official' ? '#DCFCE7' : '#E0E7FF',
                        color: variant === 'official' ? '#166534' : '#3730A3',
                        fontWeight: 600,
                        border: `1px solid ${variant === 'official' ? '#86EFAC' : '#C7D2FE'}`
                    }}>
                        {variant === 'official' ? 'API Oficial Meta' : 'Conexão Via QR Code'}
                    </span>
                </div>

                {/* Baileys Connection Button (only for pirate variant) */}
                {variant === 'pirate' && (
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
                    </div>
                )}
            </div>

            <div className={styles.chatContainer}>
                {/* Sidebar */}
                <div className={styles.contactSidebar}>
                    <div className={styles.sidebarHeader}>
                        <img
                            src={`https://ui-avatars.com/api/?name=User&background=${variant === 'official' ? '10B981' : '6366F1'}&color=fff`}
                            className={styles.avatar}
                            style={{ width: 40, height: 40 }}
                        />
                        <div style={{ display: 'flex', gap: 16, color: '#64748B' }}>
                            <MoreVertical size={20} />
                        </div>
                    </div>

                    {/* Connection info for pirate variant */}
                    {variant === 'pirate' && connectionStatus === 'connected' && (
                        <div style={{ padding: '12px 16px', backgroundColor: '#ECFDF5', borderBottom: '1px solid #E5E7EB' }}>
                            <p style={{ fontSize: '0.75rem', color: '#059669', margin: 0 }}>
                                ✓ WhatsApp conectado
                            </p>
                        </div>
                    )}

                    <div className={styles.searchBar}>
                        <div className={styles.searchWrapper}>
                            <Search size={16} className={styles.searchIcon} />
                            <input type="text" placeholder="Pesquisar..." className={styles.searchInput} />
                        </div>
                    </div>

                    {/* Filter Tabs */}
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
                        {displayChats.length > 0 ? (
                            displayChats.map((chat) => (
                                <div 
                                    key={chat.id} 
                                    className={`${styles.contactItem} ${selectedChat?.id === chat.id ? styles.active : ''}`}
                                    onClick={() => setSelectedChat(chat)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=random`} className={styles.avatar} />
                                    <div className={styles.contactInfo}>
                                        <div className={styles.contactName}>
                                            <span>{chat.name}</span>
                                            <span className={styles.lastMsgTime}>{formatTime(chat.timestamp)}</span>
                                        </div>
                                        <div className={styles.lastMsg}>
                                            {chat.lastMessage}
                                        </div>
                                    </div>
                                    {chat.unreadCount > 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            right: 16,
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
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>
                                {variant === 'pirate' && connectionStatus === 'connected' 
                                    ? 'Nenhuma conversa ainda. Envie uma mensagem para alguém!'
                                    : variant === 'pirate' 
                                    ? 'Conecte seu WhatsApp para ver as conversas'
                                    : 'Nenhuma conversa disponível'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Window */}
                <div className={`${styles.chatArea} ${variant === 'official' ? styles.themeOficial : styles.themePirata}`}>
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
                                                {msg.text}
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
                                <input 
                                    type="text" 
                                    placeholder="Mensagem" 
                                    className={styles.inputField}
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    disabled={variant === 'pirate' && connectionStatus !== 'connected'}
                                />
                                <Mic size={24} color="#64748B" />
                                <button 
                                    className={styles.sendBtn}
                                    onClick={handleSendMessage}
                                    disabled={!messageInput.trim() || isSending || (variant === 'pirate' && connectionStatus !== 'connected')}
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
                                    {variant === 'pirate' 
                                        ? 'Escolha uma conversa à esquerda para começar a conversar'
                                        : 'Escolha um contato à esquerda para visualizar as mensagens'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* QR Code Modal */}
            {showQRModal && variant === 'pirate' && (
                <div className={styles.modalOverlay} onClick={() => setShowQRModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Conectar WhatsApp</h2>
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
                                        O código é renovado automaticamente a cada 40 segundos.<br />
                                        Ou clique no botão acima para gerar um novo imediatamente.
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
