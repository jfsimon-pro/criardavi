"use client";

import { useState, useEffect } from 'react';
import styles from './AIConfig.module.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import TopBar from '@/components/TopBar/TopBar';
import { Bot, Save, Plus, Trash2, Clock, Check, Loader2, AlertCircle, RotateCcw } from 'lucide-react';

interface FollowUpStep {
    id: number;
    time: number;
    unit: string;
    message: string;
}

export default function AIConfigPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [aiEnabled, setAiEnabled] = useState(true);
    const [togglingAI, setTogglingAI] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [greeting, setGreeting] = useState('');
    const [fallbackMessage, setFallbackMessage] = useState('');
    const [maxMessages, setMaxMessages] = useState(20);
    const [responseDelay, setResponseDelay] = useState(2);

    const [steps, setSteps] = useState<FollowUpStep[]>([]);

    // Fetch config function (reusable)
    const fetchConfig = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/ai-config');
            const data = await response.json();
            
            if (data.success) {
                setAiEnabled(data.config.isActive);
                setPrompt(data.config.systemPrompt || '');
                setGreeting(data.config.greeting || '');
                setFallbackMessage(data.config.fallbackMessage || '');
                setMaxMessages(data.config.maxMessagesPerChat || 20);
                setResponseDelay(data.config.responseDelay || 2);
                setSteps(data.config.followUps || []);
            }
        } catch (err) {
            console.error('Error fetching AI config:', err);
            setError('Erro ao carregar configurações');
        } finally {
            setLoading(false);
        }
    };

    // Reset to default prompt (based on prompt.json)
    const handleReset = async () => {
        if (!confirm('⚠️ Tem certeza que deseja resetar para o prompt padrão?\n\nIsso substituirá todas as suas configurações atuais.')) {
            return;
        }
        
        setResetting(true);
        setError(null);
        
        try {
            const response = await fetch('/api/ai-config', {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Reload config to get new defaults
                await fetchConfig();
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            } else {
                setError(data.error || 'Erro ao resetar');
            }
        } catch (err) {
            console.error('Error resetting AI config:', err);
            setError('Erro ao resetar configurações');
        } finally {
            setResetting(false);
        }
    };

    // Toggle AI on/off instantly
    const toggleAI = async (enabled: boolean) => {
        setAiEnabled(enabled);
        setTogglingAI(true);
        
        try {
            const response = await fetch('/api/ai-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: enabled })
            });

            const data = await response.json();
            if (!data.success) {
                // Revert on error
                setAiEnabled(!enabled);
                setError('Erro ao alterar status da IA');
            } else {
                console.log(`✅ IA ${enabled ? 'ATIVADA' : 'DESATIVADA'}`);
            }
        } catch (err) {
            setAiEnabled(!enabled);
            setError('Erro ao alterar status da IA');
        } finally {
            setTogglingAI(false);
        }
    };

    // Load config on mount
    useEffect(() => {
        fetchConfig();
    }, []);

    const addStep = () => {
        const newStep: FollowUpStep = {
            id: Date.now(),
            time: 30,
            unit: 'minutos',
            message: ''
        };
        setSteps([...steps, newStep]);
    };

    const removeStep = (id: number) => {
        setSteps(steps.filter(s => s.id !== id));
    };

    const updateStep = (id: number, field: string, value: any) => {
        setSteps(steps.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        setError(null);

        try {
            const response = await fetch('/api/ai-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    isActive: aiEnabled,
                    systemPrompt: prompt,
                    greeting,
                    fallbackMessage,
                    maxMessagesPerChat: maxMessages,
                    responseDelay,
                    followUps: steps
                })
            });

            const data = await response.json();

            if (data.success) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            } else {
                setError(data.error || 'Erro ao salvar');
            }
        } catch (err) {
            console.error('Error saving AI config:', err);
            setError('Erro ao salvar configurações');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', paddingLeft: 250, backgroundColor: 'var(--bg-page)' }}>
                <Sidebar />
                <main style={{ padding: '32px 40px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
                    <Loader2 size={48} className={styles.spin} color="#2563EB" />
                </main>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', paddingLeft: 250, backgroundColor: 'var(--bg-page)' }}>
            <Sidebar />

            <main style={{ padding: '32px 40px' }}>
                <TopBar />

                <div className={styles.pageHeader}>
                    <div className={styles.pageTitle}>
                        <h2>Configuração de IA</h2>
                    </div>
                    {error && (
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 8, 
                            color: '#DC2626',
                            background: '#FEE2E2',
                            padding: '8px 16px',
                            borderRadius: 8,
                            fontSize: '0.9rem'
                        }}>
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}
                </div>

                <div className={styles.grid}>

                    {/* Left Col: Persona & Settings */}
                    <div>
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <div className={styles.cardTitle}>
                                    <Bot size={24} color="#2563EB" />
                                    Status e Personalidade
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    {togglingAI && <Loader2 size={16} className={styles.spin} color="#64748B" />}
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: aiEnabled ? '#10B981' : '#64748B' }}>
                                        {aiEnabled ? 'IA ATIVA' : 'IA DESATIVADA'}
                                    </span>
                                    <label className={styles.switch}>
                                        <input
                                            type="checkbox"
                                            checked={aiEnabled}
                                            onChange={(e) => toggleAI(e.target.checked)}
                                            disabled={togglingAI}
                                        />
                                        <span className={styles.slider}></span>
                                    </label>
                                </div>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                                    Prompt do Sistema
                                    <span style={{ fontWeight: 400, color: '#64748B', fontSize: '0.85rem', marginLeft: 8 }}>
                                        (Instruções completas para a IA)
                                    </span>
                                </label>
                                <textarea
                                    className={styles.promptEditor}
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder={`Defina aqui como a IA deve se comportar...

Exemplo:
Você é a Ana, assistente virtual da Clínica Estética Premium.
Seja educada, profissional e use emojis ocasionalmente.
Seu objetivo é qualificar leads e agendar consultas.

SERVIÇOS:
- Limpeza de pele: R$ 150
- Botox: R$ 800
- Preenchimento labial: R$ 1.200

IMPORTANTE - HANDOFF PARA HUMANO:
Se o cliente pedir para falar com humano, tiver reclamação grave, 
ou você não souber responder, inclua [HANDOFF] no início da resposta.`}
                                    style={{ minHeight: 300 }}
                                />
                                <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 8 }}>
                                    💡 <strong>Dica:</strong> Use [HANDOFF] no prompt para ensinar a IA quando transferir para humano.
                                    A IA incluirá [HANDOFF] na resposta e o sistema transferirá automaticamente.
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: '0.9rem' }}>
                                        Mensagem de Saudação
                                    </label>
                                    <input
                                        type="text"
                                        className={styles.textInput}
                                        value={greeting}
                                        onChange={(e) => setGreeting(e.target.value)}
                                        placeholder="Olá! 👋 Como posso ajudar?"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: '0.9rem' }}>
                                        Mensagem de Fallback
                                    </label>
                                    <input
                                        type="text"
                                        className={styles.textInput}
                                        value={fallbackMessage}
                                        onChange={(e) => setFallbackMessage(e.target.value)}
                                        placeholder="Desculpe, não entendi..."
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: '0.9rem' }}>
                                        Máx. Mensagens por Chat
                                    </label>
                                    <input
                                        type="number"
                                        className={styles.textInput}
                                        value={maxMessages}
                                        onChange={(e) => setMaxMessages(parseInt(e.target.value) || 20)}
                                        min={5}
                                        max={50}
                                    />
                                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                        Histórico enviado ao ChatGPT
                                    </span>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: '0.9rem' }}>
                                        Delay de Resposta (seg)
                                    </label>
                                    <input
                                        type="number"
                                        className={styles.textInput}
                                        value={responseDelay}
                                        onChange={(e) => setResponseDelay(parseInt(e.target.value) || 2)}
                                        min={1}
                                        max={10}
                                    />
                                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                        Simula digitação humana
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                <button 
                                    className={styles.saveBtn} 
                                    onClick={handleSave}
                                    disabled={saving || resetting}
                                    style={{ 
                                        opacity: saving ? 0.7 : 1,
                                        background: saved ? '#10B981' : undefined,
                                        flex: 1
                                    }}
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 size={18} className={styles.spin} />
                                            Salvando...
                                        </>
                                    ) : saved ? (
                                        <>
                                            <Check size={18} />
                                            Salvo!
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} />
                                            Salvar Configurações
                                        </>
                                    )}
                                </button>

                                <button 
                                    className={styles.resetBtn} 
                                    onClick={handleReset}
                                    disabled={saving || resetting}
                                    style={{ opacity: resetting ? 0.7 : 1 }}
                                    title="Resetar para o prompt padrão (Henrique do C6 Bank)"
                                >
                                    {resetting ? (
                                        <>
                                            <Loader2 size={18} className={styles.spin} />
                                            Resetando...
                                        </>
                                    ) : (
                                        <>
                                            <RotateCcw size={18} />
                                            Usar Padrão
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Col: Follow-up Strategy */}
                    <div>
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <div className={styles.cardTitle}>
                                    <Clock size={24} color="#F59E0B" />
                                    Estratégia de Follow-up
                                </div>
                            </div>

                            <div style={{ marginBottom: 16, fontSize: '0.9rem', color: '#64748B' }}>
                                Configure mensagens automáticas caso o lead não responda.
                                <br />
                                <small>⚠️ Em desenvolvimento - será ativado em breve!</small>
                            </div>

                            {steps.map((step, index) => {
                                // Calcular tempo em formato legível
                                const timeInMinutes = step.unit === 'horas' ? step.time * 60 : 
                                                     step.unit === 'dias' ? step.time * 1440 : step.time;
                                const hours = Math.floor(timeInMinutes / 60);
                                const mins = timeInMinutes % 60;
                                const timeDisplay = hours > 0 
                                    ? `${hours}h${mins > 0 ? ` ${mins}min` : ''}` 
                                    : `${mins}min`;

                                return (
                                    <div key={step.id} className={styles.stepItem}>
                                        <div className={styles.removeStep} onClick={() => removeStep(step.id)}>
                                            <Trash2 size={16} />
                                        </div>

                                        <div className={styles.stepHeader}>
                                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                                Follow-up {index + 1}
                                                <span style={{ fontWeight: 400, color: '#64748B', marginLeft: 8 }}>
                                                    ({timeDisplay} sem resposta)
                                                </span>
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                                            <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Aguardar:</span>
                                            <input 
                                                type="number" 
                                                value={step.time} 
                                                onChange={(e) => updateStep(step.id, 'time', parseInt(e.target.value) || 0)}
                                                className={styles.timeInput} 
                                                min={1}
                                            />
                                            <select 
                                                value={step.unit} 
                                                onChange={(e) => updateStep(step.id, 'unit', e.target.value)}
                                                className={styles.unitSelect}
                                            >
                                                <option value="minutos">Minutos</option>
                                                <option value="horas">Horas</option>
                                                <option value="dias">Dias</option>
                                            </select>
                                        </div>

                                        <textarea
                                            className={styles.stepMessage}
                                            placeholder="Mensagem de follow-up..."
                                            value={step.message}
                                            onChange={(e) => updateStep(step.id, 'message', e.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                );
                            })}

                            <button className={styles.addStepBtn} onClick={addStep}>
                                <Plus size={20} /> Adicionar Passo
                            </button>
                        </div>

                        {/* Info Card */}
                        <div className={styles.card} style={{ marginTop: 24, background: '#EEF2FF' }}>
                            <h4 style={{ margin: '0 0 12px 0', color: '#3730A3' }}>💡 Como funciona o Handoff para Humano</h4>
                            <p style={{ fontSize: '0.9rem', color: '#4338CA', margin: 0, lineHeight: 1.6 }}>
                                No seu prompt, ensine a IA QUANDO fazer o handoff. Por exemplo:
                                <br /><br />
                                <em>"Quando o cliente enviar documentos e dados bancários, confirme o recebimento e inclua [HANDOFF] no início da resposta."</em>
                                <br /><br />
                                O sistema automaticamente:
                                <br />• Envia a mensagem da IA (remove o marcador)
                                <br />• Move a conversa para aba <strong>"Humano"</strong>
                                <br />• Para de responder automaticamente nesse chat
                                <br />• O cliente NÃO vê que foi transferido
                            </p>
                        </div>

                        {/* Exemplo de Prompt */}
                        <div className={styles.card} style={{ marginTop: 16, background: '#F0FDF4' }}>
                            <h4 style={{ margin: '0 0 12px 0', color: '#166534' }}>📋 Estrutura recomendada do Prompt</h4>
                            <pre style={{ 
                                fontSize: '0.8rem', 
                                color: '#166534', 
                                margin: 0, 
                                lineHeight: 1.5,
                                whiteSpace: 'pre-wrap',
                                fontFamily: 'monospace'
                            }}>
{`=== PERSONA ===
Nome, empresa, regras de comportamento

=== CONTEXTO DO PRODUTO ===
Valores, taxas, datas importantes

=== ETAPAS DO ATENDIMENTO ===
1. Abertura
2. Esclarecimento de dúvidas
3. Coleta de dados
4. Fechamento [HANDOFF aqui]

=== TRATAMENTO DE NEGATIVAS ===
Argumentos para contornar objeções

=== ESTILO ===
Tom, formato das respostas`}
                            </pre>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
