import Sidebar from '@/components/Sidebar/Sidebar';
import TopBar from '@/components/TopBar/TopBar';
import InboxInterface from '@/components/Chat/InboxInterface';
import styles from '@/app/admin/dashboard/Dashboard.module.css';

interface PageProps {
    params: Promise<{ connectionId: string }>;
}

export default async function InboxPage({ params }: PageProps) {
    const { connectionId } = await params;
    const connId = parseInt(connectionId);

    if (isNaN(connId)) {
        return (
            <div className={`${styles.dashboardLayout} theme-atendant`}>
                <Sidebar variant="atendant" />
                <main className={styles.mainContent}>
                    <TopBar variant="atendant" />
                    <div style={{ padding: 24, textAlign: 'center' }}>
                        <h2>Inbox não encontrado</h2>
                        <p>O inbox solicitado não existe ou você não tem acesso.</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className={`${styles.dashboardLayout} theme-atendant`}>
            <Sidebar variant="atendant" />
            <main className={styles.mainContent}>
                <TopBar variant="atendant" />
                <InboxInterface connectionId={connId} />
            </main>
        </div>
    );
}

