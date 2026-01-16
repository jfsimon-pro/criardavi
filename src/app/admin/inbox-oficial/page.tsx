
import Sidebar from '@/components/Sidebar/Sidebar';
import TopBar from '@/components/TopBar/TopBar';
import ChatInterface from '@/components/Chat/ChatInterface';
import styles from '../dashboard/Dashboard.module.css'; // Reuse dashboard layout styles

export default function InboxOficialPage() {
    return (
        <div className={styles.dashboardLayout}>
            <Sidebar />
            <main className={styles.mainContent}>
                <TopBar />
                <ChatInterface variant="official" title="Inbox Oficial" />
            </main>
        </div>
    );
}
