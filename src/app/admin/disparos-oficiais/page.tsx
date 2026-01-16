
"use client";

import { useState } from 'react';
import styles from './Blasts.module.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import TopBar from '@/components/TopBar/TopBar';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Play } from 'lucide-react';

export default function DisparosOficiaisPage() {
    const [file, setFile] = useState<File | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleUpload = () => {
        // Mock upload
        const mockFile = new File(["dummy"], "contatos_campanha_v1.csv");
        setFile(mockFile);
    };

    const startBlast = () => {
        setIsSimulating(true);
        let curr = 0;
        const interval = setInterval(() => {
            curr += 5;
            setProgress(curr);
            if (curr >= 100) clearInterval(interval);
        }, 200);
    };

    return (
        <div style={{ minHeight: '100vh', paddingLeft: 250, backgroundColor: 'var(--bg-page)' }}>
            <Sidebar />

            <main style={{ padding: '32px 40px' }}>
                <TopBar />

                <div className={styles.pageHeader}>
                    <div className={styles.pageTitle}>
                        <h2>Nova Campanha de Disparo (Oficial)</h2>
                        <p>Configure sua campanha utilizando a API Oficial da Meta.</p>
                    </div>
                </div>

                <div className={styles.wizardGrid}>

                    {/* Left Column: Configuration */}
                    <div className={styles.leftCol}>

                        {/* 1. Template */}
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>1. Selecionar Template</div>
                            <select className={styles.templateSelect}>
                                <option>Selecione um template aprovado...</option>
                                <option>promo_black_friday_v1 (Marketing)</option>
                                <option>aviso_agendamento_cliente (Utilidade)</option>
                                <option>boas_vindas_lead (Marketing)</option>
                            </select>

                            <div style={{ padding: 16, background: '#DCFCE7', borderRadius: 8, fontSize: '0.9rem', color: '#166534' }}>
                                ℹ️ <strong>Template Selecionado:</strong> "Olá {'{{1}}'}, aproveite nossa oferta de Black Friday..."
                            </div>
                        </div>

                        {/* 2. Upload */}
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>2. Upload de Contatos</div>

                            {!file ? (
                                <div className={styles.uploadZone} onClick={handleUpload}>
                                    <UploadCloud size={48} className={styles.uploadIcon} />
                                    <div className={styles.uploadText}>Clique para fazer upload da planilha</div>
                                    <div className={styles.uploadSub}>Suporta .CSV ou .XLSX</div>
                                </div>
                            ) : (
                                <div style={{}}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                        <FileSpreadsheet size={32} color="#2563EB" />
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{file.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748B' }}>1.2 MB • 248 Contatos identificados</div>
                                        </div>
                                    </div>

                                    {/* Preview Table */}
                                    <div className={styles.tableContainer}>
                                        <table className={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th>Nome</th>
                                                    <th>Telefone</th>
                                                    <th>Variável 1</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {[1, 2, 3].map(i => (
                                                    <tr key={i}>
                                                        <td>Cliente Exemplo {i}</td>
                                                        <td>551199999999{i}</td>
                                                        <td>Promoção</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Right Column: Execution & Stats */}
                    <div className={styles.rightCol}>

                        <div className={styles.card}>
                            <div className={styles.cardTitle}>Resumo da Campanha</div>

                            <div className={styles.statItem} style={{ marginBottom: 12, textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Custo Estimado:</span>
                                <strong>R$ 15,40</strong>
                            </div>
                            <div className={styles.statItem} style={{ marginBottom: 24, textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Total de Contatos:</span>
                                <strong>248</strong>
                            </div>

                            <button
                                className={styles.startBtn}
                                onClick={startBlast}
                                disabled={isSimulating || !file}
                                style={{ opacity: !file ? 0.5 : 1 }}
                            >
                                {isSimulating ? 'Enviando...' : 'Iniciar Disparos'} <Play size={18} style={{ marginLeft: 8 }} />
                            </button>
                        </div>

                        {/* Monitoring Card (Only visible if active or mocked) */}
                        <div className={styles.card} style={{ opacity: isSimulating ? 1 : 0.5 }}>
                            <div className={styles.cardTitle}>Monitoramento em Tempo Real</div>

                            <div className={styles.progressContainer}>
                                <div className={styles.progressLabel}>
                                    <span>Progresso</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className={styles.progressBarBg}>
                                    <div className={styles.progressBarFill} style={{ width: `${progress}%` }} />
                                </div>
                            </div>

                            <div className={styles.statsGrid}>
                                <div className={styles.statItem}>
                                    <div className={`${styles.statValue} ${styles.successVal}`}>93%</div>
                                    <div className={styles.statLabel}>Entregues</div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={`${styles.statValue} ${styles.errorVal}`}>1%</div>
                                    <div className={styles.statLabel}>Falhas</div>
                                </div>
                            </div>

                            <div style={{ marginTop: 16, fontSize: '0.85rem', color: '#64748B' }}>
                                <CheckCircle2 size={14} style={{ display: 'inline', marginRight: 4, color: '#10B981' }} />
                                Serviço rodando normalmente
                            </div>
                        </div>

                    </div>

                </div>
            </main>
        </div>
    );
}
