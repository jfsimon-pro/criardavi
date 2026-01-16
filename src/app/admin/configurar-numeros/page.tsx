
"use client";

import { useState } from 'react';
import styles from './NumberConfig.module.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import TopBar from '@/components/TopBar/TopBar';
import { ShieldCheck, Smartphone, Plus, Trash2, Key, Hash, Phone, X } from 'lucide-react';

export default function NumberConfigPage() {
    const [token, setToken] = useState('EAAG...');
    const [wabaId, setWabaId] = useState('1005234...');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [newAlias, setNewAlias] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newId, setNewId] = useState('');

    const [numbers, setNumbers] = useState([
        { id: 1, alias: 'Linha Principal', phone: '+55 11 99999-9999', phoneId: '123456789' },
        { id: 2, alias: 'Suporte Técnico', phone: '+55 11 98888-8888', phoneId: '987654321' }
    ]);

    const handleAddNumber = () => {
        if (!newAlias || !newPhone || !newId) return; // Simple validation

        const newNum = {
            id: Date.now(),
            alias: newAlias,
            phone: newPhone,
            phoneId: newId
        };
        setNumbers([...numbers, newNum]);
        setShowModal(false);

        // Reset form
        setNewAlias('');
        setNewPhone('');
        setNewId('');
    };

    const removeNumber = (id: number) => {
        setNumbers(numbers.filter(n => n.id !== id));
    };

    return (
        <div style={{ minHeight: '100vh', paddingLeft: 250, backgroundColor: 'var(--bg-page)' }}>
            <Sidebar />

            <main style={{ padding: '32px 40px' }}>
                <TopBar />

                <div className={styles.pageHeader}>
                    <div className={styles.pageTitle}>
                        <h2>Configuração de Números (API Oficial)</h2>
                        <p>Gerencie suas credenciais e linhas do WhatsApp Business API.</p>
                    </div>
                </div>

                {/* Global Settings */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <ShieldCheck size={24} color="#2563EB" />
                        <div className={styles.cardTitle}>Credenciais Globais</div>
                    </div>

                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label>Access Token (Token Permanente)</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="password"
                                    className={styles.input}
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                />
                                <Key size={16} style={{ position: 'absolute', right: 16, top: 14, color: '#94A3B8' }} />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>WABA ID (WhatsApp Business Account ID)</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={wabaId}
                                    onChange={(e) => setWabaId(e.target.value)}
                                />
                                <Hash size={16} style={{ position: 'absolute', right: 16, top: 14, color: '#94A3B8' }} />
                            </div>
                        </div>
                    </div>

                    <button className={styles.saveBtn}>Salvar Credenciais</button>
                </div>

                {/* Numbers List */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <Smartphone size={24} color="#10B981" />
                        <div className={styles.cardTitle}>Meus Números Conectados</div>
                    </div>

                    <div className={styles.numberList}>
                        {numbers.map((num) => (
                            <div key={num.id} className={styles.numberItem}>
                                <div className={styles.numberInfo}>
                                    <div className={styles.numberIcon}>
                                        <Phone size={20} />
                                    </div>
                                    <div className={styles.numberDetails}>
                                        <h4>{num.alias}</h4>
                                        <p>{num.phone} • ID: {num.phoneId || 'Não configurado'}</p>
                                    </div>
                                </div>

                                <div className={styles.deleteBtn} onClick={() => removeNumber(num.id)}>
                                    <Trash2 size={20} />
                                </div>
                            </div>
                        ))}

                        <button className={styles.addNumberBtn} onClick={() => setShowModal(true)}>
                            <Plus size={20} /> Adicionar Novo Número
                        </button>
                    </div>
                </div>

            </main>

            {/* Add Number Modal */}
            {showModal && (
                <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>Adicionar Número</h3>
                            <X size={20} className={styles.closeBtn} onClick={() => setShowModal(false)} />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Apelido (ex: Suporte, Vendas)</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={newAlias}
                                onChange={(e) => setNewAlias(e.target.value)}
                                placeholder="Ex: Comercial Principal"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Número de Telefone (Display)</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={newPhone}
                                onChange={(e) => setNewPhone(e.target.value)}
                                placeholder="+55 11 99999-9999"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Phone Number ID (Meta)</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={newId}
                                onChange={(e) => setNewId(e.target.value)}
                                placeholder="Ex: 3847294729472"
                            />
                        </div>

                        <div className={styles.modalActions}>
                            <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancelar</button>
                            <button className={styles.confirmBtn} onClick={handleAddNumber}>Conectar Número</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
