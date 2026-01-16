'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    Inbox,
    Settings,
    Megaphone,
    Send,
    MessageCircle,
    Bot,
    FileText,
    ChevronDown,
    ChevronRight,
    Home,
    LayoutTemplate,
    Filter,
    Calendar,
    Users,
    Plus,
    Wifi,
    WifiOff,
    Loader2,
    Menu,
    X
} from 'lucide-react';
import styles from './Sidebar.module.css';

interface SidebarProps {
    variant?: 'admin' | 'atendant';
}

interface InboxItem {
    id: number;
    displayName: string;
    phoneNumber: string | null;
    liveStatus: string;
    isConnecting: boolean;
}

export default function Sidebar({ variant = 'admin' }: SidebarProps) {
    const isAdmin = variant === 'admin';
    const basePath = isAdmin ? '/admin' : '/atendente';
    const pathname = usePathname();
    const router = useRouter();

    const [inboxes, setInboxes] = useState<InboxItem[]>([]);
    const [inboxesExpanded, setInboxesExpanded] = useState(true);
    const [creatingInbox, setCreatingInbox] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Close mobile menu when route changes
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileMenuOpen]);

    const isActive = (path: string) => {
        return pathname === path || pathname.startsWith(`${path}/`);
    };

    // Fetch inboxes for the sidebar
    useEffect(() => {
        const fetchInboxes = async () => {
            try {
                const response = await fetch('/api/baileys/inboxes');
                const data = await response.json();
                if (data.success) {
                    setInboxes(data.inboxes);
                }
            } catch (error) {
                console.error('Error fetching inboxes:', error);
            }
        };

        fetchInboxes();
        const interval = setInterval(fetchInboxes, 10000); // Refresh every 10s

        return () => clearInterval(interval);
    }, []);

    const handleCreateInbox = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setCreatingInbox(true);
        
        try {
            const response = await fetch('/api/baileys/inboxes', {
                method: 'POST',
            });
            const data = await response.json();
            if (data.success) {
                router.push(`/atendente/inbox-pirata/${data.connectionId}`);
            }
        } catch (error) {
            console.error('Error creating inbox:', error);
        } finally {
            setCreatingInbox(false);
        }
    };

    const getStatusIcon = (inbox: InboxItem) => {
        if (inbox.liveStatus === 'connected') {
            return <Wifi size={12} color="#10B981" />;
        } else if (inbox.liveStatus === 'connecting' || inbox.isConnecting) {
            return <Loader2 size={12} color="#F59E0B" className={styles.spin} />;
        } else {
            return <WifiOff size={12} color="#94A3B8" />;
        }
    };

    return (
        <>
            {/* Mobile Menu Button */}
            <button 
                className={styles.mobileMenuButton}
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Abrir menu"
            >
                <Menu size={24} color="#1E293B" />
            </button>

            {/* Overlay */}
            <div 
                className={`${styles.overlay} ${mobileMenuOpen ? styles.overlayVisible : ''}`}
                onClick={() => setMobileMenuOpen(false)}
            />

            <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.sidebarOpen : ''}`}>
                {/* Close button for mobile */}
                <button 
                    className={styles.closeButton}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Fechar menu"
                >
                    <X size={24} />
                </button>

                <div className={styles.logo}>
                    <Image
                        src="/logo-sidebar.svg"
                        alt="Logo"
                        width={100}
                        height={32}
                        className={styles.logoImage}
                    />
                    <button className={styles.collapseButton}>
                        <ChevronDown size={18} />
                    </button>
                </div>

            <nav className={styles.navSection}>
                {/* Dashboard */}
                <Link href={`${basePath}/dashboard`}>
                    <div className={`${styles.navItem} ${isActive(`${basePath}/dashboard`) ? styles.active : ''}`}>
                        <Home size={20} />
                        <span>Dashboard</span>
                    </div>
                </Link>

                {/* Mensageria / Disparos */}
                {(isAdmin) && (
                    <Link href="/admin/disparos-oficiais">
                        <div className={`${styles.navItem} ${isActive('/admin/disparos-oficiais') ? styles.active : ''}`}>
                            <Megaphone size={20} />
                            <span>Disparos Oficiais</span>
                        </div>
                    </Link>
                )}

                <Link href={`${basePath}/disparos-piratas`}>
                    <div className={`${styles.navItem} ${isActive(`${basePath}/disparos-piratas`) ? styles.active : ''}`}>
                        <Send size={20} />
                        <span>Disparos Free</span>
                    </div>
                </Link>

                {/* Inbox Oficial */}
                <Link href={`${basePath}/inbox-oficial`}>
                    <div className={`${styles.navItem} ${isActive(`${basePath}/inbox-oficial`) ? styles.active : ''}`}>
                        <Inbox size={20} />
                        <span>Inbox Oficial</span>
                        <span className={styles.badge}>1</span>
                    </div>
                </Link>

                {/* Inbox Free Section - Expandable */}
                <div className={styles.navGroup}>
                    <div 
                        className={`${styles.navItem} ${styles.navGroupHeader} ${isActive(`${basePath}/inbox-pirata`) ? styles.active : ''}`}
                        onClick={() => setInboxesExpanded(!inboxesExpanded)}
                        style={{ cursor: 'pointer' }}
                    >
                        <MessageCircle size={20} />
                        <span>Inbox Free</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {inboxes.length > 0 && (
                                <span className={styles.badge} style={{ background: '#6366F1' }}>
                                    {inboxes.length}
                                </span>
                            )}
                            {inboxesExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                    </div>

                    {inboxesExpanded && (
                        <div className={styles.navSubItems}>
                            {/* Ver Todos link */}
                            <Link href={`${basePath}/inbox-pirata`}>
                                <div className={`${styles.navSubItem} ${pathname === `${basePath}/inbox-pirata` ? styles.active : ''}`}>
                                    <span>📋 Ver Todos</span>
                                </div>
                            </Link>

                            {/* Individual inboxes */}
                            {inboxes.map((inbox) => (
                                <Link key={inbox.id} href={`${basePath}/inbox-pirata/${inbox.id}`}>
                                    <div className={`${styles.navSubItem} ${pathname === `${basePath}/inbox-pirata/${inbox.id}` ? styles.active : ''}`}>
                                        {getStatusIcon(inbox)}
                                        <span style={{ 
                                            flex: 1, 
                                            overflow: 'hidden', 
                                            textOverflow: 'ellipsis', 
                                            whiteSpace: 'nowrap' 
                                        }}>
                                            {inbox.displayName}
                                        </span>
                                    </div>
                                </Link>
                            ))}

                            {/* Add new inbox button */}
                            <div 
                                className={`${styles.navSubItem} ${styles.addInboxButton}`}
                                onClick={handleCreateInbox}
                                style={{ cursor: creatingInbox ? 'wait' : 'pointer' }}
                            >
                                {creatingInbox ? (
                                    <Loader2 size={14} className={styles.spin} />
                                ) : (
                                    <Plus size={14} />
                                )}
                                <span>{creatingInbox ? 'Criando...' : '+ Novo Inbox'}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* IA & Reports */}
                {isAdmin && (
                    <>
                        <Link href="/admin/leads">
                            <div className={`${styles.navItem} ${isActive('/admin/leads') ? styles.active : ''}`}>
                                <Users size={20} />
                                <span>Leads</span>
                            </div>
                        </Link>
                        <Link href="/admin/funis">
                            <div className={`${styles.navItem} ${isActive('/admin/funis') ? styles.active : ''}`}>
                                <Filter size={20} />
                                <span>Funis de Vendas</span>
                            </div>
                        </Link>
                        <Link href="/admin/agenda">
                            <div className={`${styles.navItem} ${isActive('/admin/agenda') ? styles.active : ''}`}>
                                <Calendar size={20} />
                                <span>Agenda</span>
                            </div>
                        </Link>
                        <Link href="/admin/templates">
                            <div className={`${styles.navItem} ${isActive('/admin/templates') ? styles.active : ''}`}>
                                <LayoutTemplate size={20} />
                                <span>Templates</span>
                            </div>
                        </Link>
                        <Link href="/admin/configuracao-ia">
                            <div className={`${styles.navItem} ${isActive('/admin/configuracao-ia') ? styles.active : ''}`}>
                                <Bot size={20} />
                                <span className="truncate">Configuração IA</span>
                            </div>
                        </Link>
                        <Link href="/admin/gerenciar-conexoes">
                            <div className={`${styles.navItem} ${isActive('/admin/gerenciar-conexoes') ? styles.active : ''}`}>
                                <Settings size={20} />
                                <span>Gerenciar Conexões</span>
                            </div>
                        </Link>
                        <Link href="/admin/relatorios-ia">
                            <div className={`${styles.navItem} ${isActive('/admin/relatorios-ia') ? styles.active : ''}`}>
                                <FileText size={20} />
                                <span>Relatórios</span>
                            </div>
                        </Link>
                    </>
                )}
            </nav>

            {/* Footer Section */}
            <div className={styles.footer}>
                {isAdmin && (
                    <Link href="/admin/configurar-numeros">
                        <div className={`${styles.navItem} ${isActive('/admin/configurar-numeros') ? styles.active : ''}`}>
                            <Settings size={20} />
                            <span>Configurações</span>
                        </div>
                    </Link>
                )}
            </div>
        </aside>
        </>
    );
}
