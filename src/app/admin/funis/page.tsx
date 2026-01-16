'use client';

import React, { useState } from 'react';
import styles from './page.module.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import TopBar from '@/components/TopBar/TopBar';
import { Plus, Trash2, Edit2, XCircle, UserPlus, ChevronDown, Lock } from 'lucide-react';

const funnelData = [
    {
        id: 'col1',
        title: 'Interesse Qualificado',
        theme: 'colBlue',
        badgeTheme: 'badgeBlue',
        leads: [
            { id: 1, name: 'Vitor Nolasco', phone: '61 982400709', avatar: '#E2E8F0' },
            { id: 2, name: 'Jaime Simon', phone: '61 984508798', avatar: '#E2E8F0' },
            { id: 3, name: 'Matheus Felix', phone: '61 983476915', avatar: '#E2E8F0' },
            { id: 4, name: 'Jacob Jones', phone: '61 983476556', avatar: '#E2E8F0' },
            { id: 5, name: 'Jenny Wilson', phone: '61 987645897', avatar: '#E2E8F0' },
            { id: 6, name: 'William Thomas', phone: '61 987645897', avatar: '#E2E8F0' }
        ]
    },
    {
        id: 'col2',
        title: 'Conversão',
        theme: 'colPurple',
        badgeTheme: 'badgePurple',
        leads: [
            { id: 7, name: 'Vitor Nolasco', phone: '61 982400709', avatar: '#F3E8FF' },
            { id: 8, name: 'Jaime Simon', phone: '61 984508798', avatar: '#F3E8FF' },
            { id: 9, name: 'Matheus Felix', phone: '61 983476915', avatar: '#F3E8FF' },
            { id: 10, name: 'Jacob Jones', phone: '61 983476556', avatar: '#F3E8FF' },
            { id: 11, name: 'Jenny Wilson', phone: '61 987645897', avatar: '#F3E8FF' },
            { id: 12, name: 'William Thomas', phone: '61 987645897', avatar: '#F3E8FF' }
        ]
    },
    {
        id: 'col3',
        title: 'Não Conversão',
        theme: 'colGreen',
        badgeTheme: 'badgeGreen',
        leads: [
            { id: 13, name: 'Vitor Nolasco', phone: '61 982400709', avatar: '#DCFCE7' },
            { id: 14, name: 'Jaime Simon', phone: '61 984508798', avatar: '#DCFCE7' },
            { id: 15, name: 'Matheus Felix', phone: '61 983476915', avatar: '#DCFCE7' },
            { id: 16, name: 'Jacob Jones', phone: '61 983476556', avatar: '#DCFCE7' },
            { id: 17, name: 'Jenny Wilson', phone: '61 987645897', avatar: '#DCFCE7' },
            { id: 18, name: 'William Thomas', phone: '61 987645897', avatar: '#DCFCE7' }
        ]
    },
    {
        id: 'col4',
        title: 'Não Conversão',
        theme: 'colYellow',
        badgeTheme: 'badgeYellow',
        leads: [
            { id: 19, name: 'Vitor Nolasco', phone: '61 982400709', avatar: '#FEF9C3' },
            { id: 20, name: 'Jaime Simon', phone: '61 984508798', avatar: '#FEF9C3' },
            { id: 21, name: 'Matheus Felix', phone: '61 983476915', avatar: '#FEF9C3' },
            { id: 22, name: 'Jacob Jones', phone: '61 983476556', avatar: '#FEF9C3' },
            { id: 23, name: 'Jenny Wilson', phone: '61 987645897', avatar: '#FEF9C3' },
            { id: 24, name: 'William Thomas', phone: '61 987645897', avatar: '#FEF9C3' }
        ]
    }
];

export default function FunnelsPage() {
    const [showAddStage, setShowAddStage] = useState(false);

    return (
        <div style={{ minHeight: '100vh', paddingLeft: 250, backgroundColor: 'var(--bg-page)' }}>
            <Sidebar />

            <main style={{ padding: '32px 40px' }}>
                <TopBar />

                <div className={styles.container}>
                    {/* Top Header */}
                    <div className={styles.topHeader}>
                        <div className={styles.titleGroup}>
                            <h1 className={styles.pageTitle}>CRM</h1>
                            <button className={styles.btnDark}>Criar Novo Funil</button>
                        </div>
                        <select className={styles.funnelSelect}>
                            <option>Funil Inicial</option>
                            <option>Funil de Vendas</option>
                        </select>
                    </div>

                    {/* Funnel Header */}
                    <div className={styles.subHeader}>
                        <h2 className={styles.funnelTitle}>Funil Inicial</h2>
                        <button className={styles.btnAddStage} onClick={() => setShowAddStage(!showAddStage)}>
                            <Plus size={18} /> Nova Etapa
                        </button>
                    </div>

                    {/* Add Stage Form (Conditionally Rendered) */}
                    {showAddStage && (
                        <div className={styles.addStageBox}>
                            <div className={styles.addStageTitle}>Adicionar Nova Etapa</div>
                            <input type="text" placeholder="Nome da Etapa" className={styles.inputStage} />
                            <div className={styles.addStageActions}>
                                <button className={styles.btnConfirm}>Adicionar</button>
                                <button className={styles.btnCancel} onClick={() => setShowAddStage(false)}>Cancelar</button>
                            </div>
                        </div>
                    )}

                    {/* Board */}
                    <div className={styles.board}>
                        {funnelData.map((col) => (
                            <div key={col.id} className={`${styles.column} ${styles[col.theme]}`}>
                                <div className={styles.lockOverlay}>
                                    <Lock size={48} strokeWidth={2} />
                                </div>
                                <div className={styles.columnHeader}>
                                    <div className={styles.columnTitle}>
                                        {col.title}
                                        <span className={`${styles.countBadge} ${styles[col.badgeTheme]}`}>2</span>
                                    </div>
                                    <Trash2 size={16} className={styles.headerActions} />
                                </div>

                                {col.leads.map((lead) => (
                                    <div key={lead.id} className={styles.card}>
                                        <div className={styles.cardLeft}>
                                            <div className={styles.avatar} style={{ backgroundColor: col.theme === 'colBlue' ? '#E2E8F0' : col.badgeTheme === 'badgePurple' ? '#F3E8FF' : '#E2E8F0' }}>
                                                {/* Initials or empty */}
                                            </div>
                                            <div className={styles.cardInfo}>
                                                <span className={styles.leadName}>{lead.name}</span>
                                                <span className={styles.leadPhone}>{lead.phone}</span>
                                            </div>
                                        </div>
                                        <div className={styles.cardActions}>
                                            <button className={styles.iconBtn}><Edit2 size={14} /></button>
                                            <button className={styles.iconBtn}><XCircle size={14} /></button>
                                        </div>
                                    </div>
                                ))}

                                <button className={styles.btnAddLead}>
                                    <UserPlus size={16} /> Adicionar Lead
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
