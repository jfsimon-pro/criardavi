'use client';

import React from 'react';
import styles from './page.module.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import TopBar from '@/components/TopBar/TopBar';
import { Search, Filter, Plus, User, MoreHorizontal, Lock } from 'lucide-react';

const leadsData = [
    { id: 1, name: 'Alice Alves', phone: '(61) 982400709', email: 'email@gmail.com', interest: 'Clínica Estética', date: '16 Mar 2025', avatarColor: 'avatarPurple' },
    { id: 2, name: 'Ruan Santos', phone: '(61) 982400709', email: 'email@gmail.com', interest: 'Clínica Estética', date: '16 Mar 2025', avatarColor: 'avatarGray' },
    { id: 3, name: 'Leticia Mota', phone: '(61) 982400709', email: 'email@gmail.com', interest: 'Clínica Estética', date: '16 Mar 2025', avatarColor: 'avatarRed' },
    { id: 4, name: 'Carlos Aguia', phone: '(61) 982400709', email: 'email@gmail.com', interest: 'Clínica Estética', date: '16 Mar 2025', avatarColor: 'avatarPurple' },
    { id: 5, name: 'Maria Rosario', phone: '(61) 982400709', email: 'email@gmail.com', interest: 'Clínica Estética', date: '16 Mar 2025', avatarColor: 'avatarRed' },
    { id: 6, name: 'Duan Rocha', phone: '(61) 982400709', email: 'email@gmail.com', interest: 'Clínica Estética', date: '16 Mar 2025', avatarColor: 'avatarGray' },
    { id: 7, name: 'William Cortes', phone: '(61) 982400709', email: 'email@gmail.com', interest: 'Clínica Estética', date: '16 Mar 2025', avatarColor: 'avatarPurple' },
    { id: 8, name: 'Edimilson Araujo', phone: '(61) 982400709', email: 'email@gmail.com', interest: 'Clínica Estética', date: '16 Mar 2025', avatarColor: 'avatarRed' },
    { id: 9, name: 'Ederson Manuel', phone: '(61) 982400709', email: 'email@gmail.com', interest: 'Clínica Estética', date: '16 Mar 2025', avatarColor: 'avatarPurple' },
];

export default function LeadsPage() {
    return (
        <div style={{ minHeight: '100vh', paddingLeft: 250, backgroundColor: 'var(--bg-page)' }}>
            <Sidebar />

            <main style={{ padding: '32px 40px' }}>
                <TopBar />

                <div className={styles.topHeader}>
                    <h1 className={styles.pageTitle}>Leads</h1>

                    <div className={styles.controls}>
                        <div className={styles.searchWrapper}>
                            <Search className={styles.searchIcon} size={18} />
                            <input type="text" placeholder="Procurar..." className={styles.searchInput} />
                        </div>
                        <button className={styles.btnFilter}>
                            <Filter size={18} /> Filtros
                        </button>
                        <button className={styles.btnAdd}>
                            + Adicionar Lead
                        </button>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <div className={styles.lockOverlay}>
                        <Lock size={48} strokeWidth={2} />
                    </div>
                    {/* Header Row */}
                    <div className={styles.tableHeader}>
                        <span></span> {/* Avatar column */}
                        <span>Nome</span>
                        <span>Telefone</span>
                        <span>Email</span>
                        <span>Interesse</span>
                        <span>Data de entrada</span>
                        <span></span>
                    </div>

                    {/* Data Rows */}
                    {leadsData.map((lead) => (
                        <div key={lead.id} className={styles.tableRow}>
                            <div className={`${styles.avatar} ${styles[lead.avatarColor]}`}>
                                {lead.avatarColor === 'avatarGray' && <User size={20} color="#94A3B8" />}
                            </div>
                            <span className={styles.name}>{lead.name}</span>
                            <span className={styles.cell}>{lead.phone}</span>
                            <span className={styles.cell}>{lead.email}</span>
                            <span className={styles.cell}>{lead.interest}</span>
                            <span className={styles.cell}>{lead.date}</span>
                            <span className={styles.actions}><MoreHorizontal size={20} /></span>
                        </div>
                    ))}
                </div>

            </main>
        </div>
    );
}
