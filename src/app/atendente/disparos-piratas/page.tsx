"use client";

import styles from '@/app/admin/disparos-oficiais/Blasts.module.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import TopBar from '@/components/TopBar/TopBar';
import BlastPanel from '@/components/BlastPanel/BlastPanel';

export default function AtendenteDisparosPiratasPage() {
    return (
        <div className="theme-atendant" style={{ minHeight: '100vh', paddingLeft: 250, backgroundColor: 'var(--bg-page)' }}>
            <Sidebar variant="atendant" />

            <main style={{ padding: '32px 40px' }}>
                <TopBar variant="atendant" />

                <div className={styles.pageHeader}>
                    <div className={styles.pageTitle}>
                        <h2>Disparo em Massa (Free)</h2>
                        <p>Envie mensagens ilimitadas utilizando sua conexão via QR Code.</p>
                    </div>
                </div>

                <BlastPanel variant="atendant" />
            </main>
        </div>
    );
}
