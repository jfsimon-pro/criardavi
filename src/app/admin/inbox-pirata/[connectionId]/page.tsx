import Sidebar from '@/components/Sidebar/Sidebar';
import TopBar from '@/components/TopBar/TopBar';
import InboxInterface from '@/components/Chat/InboxInterface';
import styles from '@/app/admin/dashboard/Dashboard.module.css';

interface PageProps {
    params: Promise<{ connectionId: string }>;
}

export default async function AdminInboxPage({ params }: PageProps) {
    const { connectionId } = await params;
    const connId = parseInt(connectionId);

    if (isNaN(connId)) {
        return (
            <div className={styles.dashboardLayout}>
                <Sidebar variant="admin" />
                <main className={styles.mainContent}>
                    <TopBar variant="admin" />
                    <div style={{ padding: 24, textAlign: 'center' }}>
                        <h2>Inbox não encontrado</h2>
                        <p>O inbox solicitado não existe ou você não tem acesso.</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className={styles.dashboardLayout}>
            <Sidebar variant="admin" />
            <main className={styles.mainContent}>
                <TopBar variant="admin" />
                <InboxInterface connectionId={connId} />
            </main>
        </div>
    );
}

