
import Sidebar from '@/components/Sidebar/Sidebar';
import TopBar from '@/components/TopBar/TopBar';
import ChatInterface from '@/components/Chat/ChatInterface';
import styles from '@/app/admin/dashboard/Dashboard.module.css'; // Reuse dashboard layout styles

export default function AtendenteInboxOficialPage() {
    return (
        <div className={`${styles.dashboardLayout} theme-atendant`}>
            <Sidebar variant="atendant" />
            <main className={styles.mainContent}>
                <TopBar variant="atendant" />
                <ChatInterface variant="official" title="Inbox Oficial" />
            </main>
        </div>
    );
}
