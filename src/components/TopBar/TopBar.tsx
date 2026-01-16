"use client";

import Link from 'next/link';
import { LogOut, Home } from 'lucide-react';
import { signOut } from 'next-auth/react';
import styles from './TopBar.module.css';

interface TopBarProps {
    variant?: 'admin' | 'atendant';
}

export default function TopBar({ variant = 'admin' }: TopBarProps) {
    // Current Date Formatter
    const dateStr = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    const isAdmin = variant === 'admin';

    // Dynamic content based on variant
    const homeLink = isAdmin ? "/admin/dashboard" : "/atendente/dashboard";
    const userName = isAdmin ? "Bem vindo, Markus" : "Bem vindo, Atendente";

    const handleLogout = () => {
        signOut({ callbackUrl: '/login' });
    };

    return (
        <header className={styles.topbar}>
            <div className={styles.userSection}>
                {/* Home Button instead of Avatar */}
                <Link href={homeLink}>
                    <div className={styles.homeBtn}>
                        <Home size={20} />
                    </div>
                </Link>

                <div className={styles.userInfo}>
                    <span className={styles.userName}>{userName}</span>
                    <span className={styles.curDate}>{dateStr}</span>
                </div>
            </div>

            <button className={styles.logoutBtn} title="Sair" onClick={handleLogout}>
                <LogOut size={20} />
            </button>
        </header>
    );
}


