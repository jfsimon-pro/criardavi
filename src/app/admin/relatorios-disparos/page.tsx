
"use client";

import styles from './BlastReports.module.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import TopBar from '@/components/TopBar/TopBar';
import { Calendar, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

export default function BlastReportsPage() {

    // Mock Data
    const reports = [
        { id: 1, date: '12 de Out, 2025', title: 'Promoção Black Friday Fase 1', total: 2450, success: 2380, fail: 70 },
        { id: 2, date: '05 de Out, 2025', title: 'Aviso de Manutenção', total: 1200, success: 1195, fail: 5 },
        { id: 3, date: '28 de Set, 2025', title: 'Newsletter Outubro', total: 5000, success: 4100, fail: 900 }
    ];

    return (
        <div style={{ minHeight: '100vh', paddingLeft: 250, backgroundColor: 'var(--bg-page)' }}>
            <Sidebar />

            <main style={{ padding: '32px 40px' }}>
                <TopBar />

                <div className={styles.pageHeader}>
                    <div className={styles.pageTitle}>
                        <h2>Relatórios de Disparos (Oficial)</h2>
                        <p>Histórico de entregabilidade das suas campanhas oficiais.</p>
                    </div>
                </div>

                <div className={styles.filterHeader}>
                    <Calendar size={20} color="#64748B" />
                    <select className={styles.monthSelect}>
                        <option>Outubro 2025</option>
                        <option>Setembro 2025</option>
                        <option>Agosto 2025</option>
                    </select>
                </div>

                <div className={styles.historyContainer}>
                    {reports.map((report) => {
                        const successRate = (report.success / report.total) * 100;
                        const failRate = (report.fail / report.total) * 100;

                        return (
                            <div key={report.id} className={styles.reportItem}>

                                {/* Info */}
                                <div className={styles.reportInfo}>
                                    <h3>{report.title}</h3>
                                    <p><Calendar size={14} /> {report.date}</p>
                                    <p style={{ marginTop: 8 }}><strong>{report.total.toLocaleString()}</strong> mensagens enviadas</p>
                                </div>

                                {/* Chart */}
                                <div className={styles.chartContainer}>
                                    <div className={styles.barsWrapper}>
                                        <div className={styles.barSuccess} style={{ width: `${successRate}%` }} />
                                        <div className={styles.barFailure} style={{ width: `${failRate}%` }} />
                                    </div>
                                    <div className={styles.legend}>
                                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
                                            {report.success.toLocaleString()} Sucessos ({successRate.toFixed(1)}%)
                                        </div>
                                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
                                            {report.fail.toLocaleString()} Falhas ({failRate.toFixed(1)}%)
                                        </div>
                                    </div>
                                </div>

                                {/* Action */}


                            </div>
                        )
                    })}
                </div>

            </main>
        </div>
    );
}
