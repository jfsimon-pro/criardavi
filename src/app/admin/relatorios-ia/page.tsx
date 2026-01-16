
"use client";

import { useState } from 'react';
import styles from './AIReports.module.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import TopBar from '@/components/TopBar/TopBar';
import {
    MessageSquare,
    CheckCircle2,
    Users,
    Sparkles,
    TrendingUp,
    Lightbulb,
    AlertTriangle,
    Loader2
} from 'lucide-react';

export default function AIReportsPage() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [reportVisible, setReportVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedNumber, setSelectedNumber] = useState('all');

    const generateReport = () => {
        setIsGenerating(true);
        setReportVisible(false);

        // Simulate API delay and "filtering" logic
        setTimeout(() => {
            setIsGenerating(false);
            setReportVisible(true);
        }, 2500);
    };

    return (
        <div style={{ minHeight: '100vh', paddingLeft: 250, backgroundColor: 'var(--bg-page)' }}>
            <Sidebar />

            <main style={{ padding: '32px 40px' }}>
                <TopBar />

                <div className={styles.pageHeader}>
                    <div className={styles.pageTitle}>
                        <h2>Relatórios de IA</h2>
                        <p>Análise de performance e insights automáticos.</p>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className={styles.kpiGrid}>

                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <CheckCircle2 size={18} color="#10B981" /> Conversas Concluídas
                        </div>
                        <div className={styles.kpiValue}>142</div>
                        <div className={styles.kpiTrend}>
                            <TrendingUp size={14} className={styles.trendUp} />
                            <span className={styles.trendUp}>+12%</span> vs. ontem
                        </div>
                    </div>

                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <MessageSquare size={18} color="#2563EB" /> Mensagens Enviadas
                        </div>
                        <div className={styles.kpiValue}>1,893</div>
                        <div className={styles.kpiTrend}>
                            <TrendingUp size={14} className={styles.trendUp} />
                            <span className={styles.trendUp}>+5%</span> vs. ontem
                        </div>
                    </div>

                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <Users size={18} color="#F59E0B" /> Clientes Atendidos
                        </div>
                        <div className={styles.kpiValue}>384</div>
                        <div className={styles.kpiTrend}>
                            <span style={{ color: '#64748B' }}>Estável</span>
                        </div>
                    </div>

                </div>

                {/* Insight Generator */}
                <div className={styles.insightCard}>
                    <div className={styles.sectionHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Sparkles size={24} color="#8B5CF6" />
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Analista Virtual</h3>
                                <p style={{ fontSize: '0.9rem', color: '#64748B' }}>Peça para a IA analisar todas as conversas do dia.</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <select
                                className={styles.numberSelect}
                                value={selectedNumber}
                                onChange={(e) => setSelectedNumber(e.target.value)}
                            >
                                <option value="all">Todos os Números</option>
                                <option value="1">Linha Principal</option>
                                <option value="2">Suporte Técnico</option>
                            </select>

                            <input
                                type="date"
                                className={styles.datePicker}
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                            <button
                                className={styles.generateBtn}
                                onClick={generateReport}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <><Loader2 size={18} className="spin" /> Analisando...</>
                                ) : (
                                    <><Sparkles size={18} /> Gerar Relatório de Insights</>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    {isGenerating && (
                        <div className={styles.loadingPulse}>
                            <Loader2 size={48} className="spin" color="#2563EB" />
                            <p>Lendo os logs de conversas de {selectedDate} {selectedNumber !== 'all' ? `(Número: ${selectedNumber === '1' ? 'Linha Principal' : 'Suporte'})` : '(Todos os números)'}...</p>
                        </div>
                    )}

                    {!isGenerating && !reportVisible && (
                        <div style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>
                            <Lightbulb size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                            <p>Selecione uma data e um número, depois clique em "Gerar Relatório".</p>
                        </div>
                    )}

                    {reportVisible && (
                        <div className={styles.reportContainer}>
                            <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px dashed #CBD5E1' }}>
                                <h3 style={{ marginBottom: 4 }}>Relatório de Inteligência do Dia: {selectedDate}</h3>
                                <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
                                    Gerado automaticamente por Supervisor AI • Escopo: {selectedNumber === 'all' ? 'Todos os Números' : (selectedNumber === '1' ? 'Linha Principal' : 'Suporte Técnico')}
                                </span>
                            </div>

                            <div className={styles.reportBlock}>
                                <h4 style={{ color: '#166534' }}><CheckCircle2 size={20} /> Pontos Positivos</h4>
                                <ul style={{ paddingLeft: 24, listStyle: 'disc', color: '#334155' }}>
                                    <li style={{ marginBottom: 8 }}>A IA conseguiu reverter <strong>15 objeções de preço</strong> utilizando o argumento de "ROI garantido".</li>
                                    <li style={{ marginBottom: 8 }}>O tempo médio de resposta caiu para <strong>12 segundos</strong>, aumentando a satisfação.</li>
                                </ul>
                            </div>

                            <div className={styles.reportBlock}>
                                <h4 style={{ color: '#D97706' }}><AlertTriangle size={20} /> Pontos de Atenção</h4>
                                <ul style={{ paddingLeft: 24, listStyle: 'disc', color: '#334155' }}>
                                    <li style={{ marginBottom: 8 }}>Em 3 conversas, a IA insistiu no agendamento mesmo após o cliente dizer "não tenho interesse agora". Sugiro ajustar a sensibilidade.</li>
                                </ul>
                            </div>

                            <div className={styles.reportBlock}>
                                <h4 style={{ color: '#2563EB' }}><Lightbulb size={20} /> Sugestão de Melhoria</h4>
                                <p style={{ color: '#334155' }}>
                                    Muitos clientes perguntaram sobre "formas de parcelamento" logo no início.
                                    Que tal adicionar essa informação já na mensagem de boas-vindas do fluxo?
                                </p>
                            </div>

                        </div>
                    )}

                </div>

            </main>

            <style jsx global>{`
        .spin {
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
