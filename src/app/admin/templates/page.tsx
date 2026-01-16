'use client';

import React from 'react';
import styles from './page.module.css';
import { Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react';

// Dummy data for templates
const templates = [
    {
        id: 1,
        name: 'welcome_message',
        category: 'MARKETING',
        language: 'pt_BR',
        status: 'APPROVED',
        body: 'Olá {{1}}, bem-vindo ao Cr.iar! Estamos felizes em tê-lo conosco. Como podemos ajudar você hoje?'
    },
    {
        id: 2,
        name: 'offer_black_friday',
        category: 'MARKETING',
        language: 'pt_BR',
        status: 'REJECTED',
        body: 'Super oferta BLACK FRIDAY! 50% de desconto em todos os produtos. Compre agora!'
    },
    {
        id: 3,
        name: 'appointment_reminder',
        category: 'UTILITY',
        language: 'pt_BR',
        status: 'PENDING',
        body: 'Olá {{1}}, lembrete do seu agendamento para amanhã às {{2}}. Confirma presença?'
    },
    {
        id: 4,
        name: 'payment_update',
        category: 'UTILITY',
        language: 'pt_BR',
        status: 'APPROVED',
        body: 'Seu pagamento de {{1}} foi confirmado. Obrigado!'
    }
];

import { useState } from 'react';
import Sidebar from '@/components/Sidebar/Sidebar';
import TopBar from '@/components/TopBar/TopBar';
import Modal from '@/components/Modal/Modal';

export default function TemplatesPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'APPROVED': return styles.statusApproved;
            case 'PENDING': return styles.statusPending;
            case 'REJECTED': return styles.statusRejected;
            default: return '';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'Aprovado';
            case 'PENDING': return 'Em Análise';
            case 'REJECTED': return 'Rejeitado';
            default: return status;
        }
    };

    return (
        <div style={{ minHeight: '100vh', paddingLeft: 250, backgroundColor: 'var(--bg-page)' }}>
            <Sidebar />

            <main style={{ padding: '32px 40px' }}>
                <TopBar />

                <div className={styles.container}>
                    {/* Header */}
                    <div className={styles.header}>
                        <div>
                            <h1 className={styles.title}>Meus Templates</h1>
                            <p className="text-sm text-gray-500 mt-1">Gerencie seus modelos de mensagem do WhatsApp.</p>
                        </div>
                        <button className={styles.createButton} onClick={() => setIsModalOpen(true)}>
                            <Plus size={20} />
                            Criar Novo Template
                        </button>
                    </div>

                    {/* Grid */}
                    <div className={styles.grid}>
                        {templates.map((template) => (
                            <div key={template.id} className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <div>
                                        <h3 className={styles.templateName}>{template.name}</h3>
                                        <span className={styles.templateCategory}>{template.category}</span>
                                    </div>
                                    <span className={`${styles.statusBadge} ${getStatusStyle(template.status)}`}>
                                        {getStatusLabel(template.status)}
                                    </span>
                                </div>

                                <div className={styles.cardBody}>
                                    {template.body}
                                </div>

                                <div className={styles.cardFooter}>
                                    <span className={styles.language}>{template.language}</span>
                                    <div className={styles.actions}>
                                        <button className={styles.actionButton} title="Editar">
                                            <Edit2 size={18} />
                                        </button>
                                        <button className={styles.actionButton} title="Excluir">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Create Template Modal */}
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title="Novo Template"
                >
                    <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Nome do Template</label>
                            <input
                                type="text"
                                placeholder="ex: promocao_verao"
                                className={styles.input}
                            />
                            <span className={styles.helperText}>Apenas letras minúsculas e _ (underline).</span>
                        </div>

                        <div className={styles.row}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Categoria</label>
                                <select className={styles.select}>
                                    <option value="MARKETING">Marketing</option>
                                    <option value="UTILITY">Utilidade</option>
                                    <option value="AUTHENTICATION">Autenticação</option>
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Idioma</label>
                                <select className={styles.select}>
                                    <option value="pt_BR">Português (BR)</option>
                                    <option value="en_US">Inglês (US)</option>
                                    <option value="es_ES">Espanhol (ES)</option>
                                </select>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Conteúdo da Mensagem</label>
                            <textarea
                                rows={5}
                                placeholder="Digite o texto da mensagem. Use {{1}}, {{2}} para variáveis."
                                className={styles.textarea}
                            ></textarea>
                        </div>

                        <div className={styles.buttonGroup}>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className={styles.cancelButton}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className={styles.submitButton}
                            >
                                Criar e Enviar para Análise
                            </button>
                        </div>
                    </form>
                </Modal>

            </main>
        </div>
    );
}
