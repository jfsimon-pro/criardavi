"use client";

import styles from '../disparos-oficiais/Blasts.module.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import TopBar from '@/components/TopBar/TopBar';
import BlastPanel from '@/components/BlastPanel/BlastPanel';

export default function DisparosPiratasPage() {
    return (
        <div style={{ minHeight: '100vh', paddingLeft: 250, backgroundColor: 'var(--bg-page)' }}>
            <Sidebar />

            <main style={{ padding: '32px 40px' }}>
                <TopBar />

                <div className={styles.pageHeader}>
                    <div className={styles.pageTitle}>
                        <h2>Disparo em Massa (Pirata)</h2>
                        <p>Envie mensagens ilimitadas utilizando sua conexão via QR Code.</p>
                    </div>
                </div>

                <BlastPanel variant="admin" />
            </main>
        </div>
    );
}
