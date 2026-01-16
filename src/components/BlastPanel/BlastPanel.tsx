'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './BlastPanel.module.css';
import { 
    UploadCloud, 
    FileSpreadsheet, 
    AlertCircle, 
    Send, 
    CheckCircle2, 
    XCircle, 
    Wifi, 
    WifiOff,
    Loader2,
    Download,
    Trash2,
    Plus,
    X
} from 'lucide-react';

interface Contact {
    cpf: string;
    nome: string;
    numero: string;
    status?: 'pending' | 'sent' | 'failed';
    error?: string;
}

interface InboxOption {
    id: number;
    displayName: string;
    phoneNumber: string | null;
    liveStatus: string;
}

interface BlastPanelProps {
    variant?: 'admin' | 'atendant';
}

export default function BlastPanel({ variant = 'admin' }: BlastPanelProps) {
    const [inboxes, setInboxes] = useState<InboxOption[]>([]);
    const [selectedInbox, setSelectedInbox] = useState<number | null>(null);
    const [messages, setMessages] = useState<string[]>(['']); // Array of messages
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const [isBlasting, setIsBlasting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<{ sent: number; failed: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [delayMin, setDelayMin] = useState(35);
    const [delayMax, setDelayMax] = useState(180);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Add a new message slot
    const addMessage = () => {
        if (messages.length < 20) {
            setMessages([...messages, '']);
        }
    };

    // Remove a message slot
    const removeMessage = (index: number) => {
        if (messages.length > 1) {
            setMessages(messages.filter((_, i) => i !== index));
        }
    };

    // Update a specific message
    const updateMessage = (index: number, value: string) => {
        const newMessages = [...messages];
        newMessages[index] = value;
        setMessages(newMessages);
    };

    // Fetch available inboxes
    useEffect(() => {
        const fetchInboxes = async () => {
            try {
                const response = await fetch('/api/baileys/inboxes');
                const data = await response.json();
                if (data.success) {
                    setInboxes(data.inboxes);
                    // Auto-select first connected inbox
                    const connectedInbox = data.inboxes.find((i: InboxOption) => i.liveStatus === 'connected');
                    if (connectedInbox) {
                        setSelectedInbox(connectedInbox.id);
                    }
                }
            } catch (error) {
                console.error('Error fetching inboxes:', error);
            }
        };

        fetchInboxes();
        const interval = setInterval(fetchInboxes, 5000);
        return () => clearInterval(interval);
    }, []);

    // Parse CSV file
    const parseCSV = useCallback((text: string): Contact[] => {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        // Get headers (first line)
        const headers = lines[0].split(',').map(h => h.trim().toUpperCase());
        
        // Find column indices
        const cpfIndex = headers.findIndex(h => h === 'CPF');
        const nomeIndex = headers.findIndex(h => h === 'NOME');
        const numeroIndex = headers.findIndex(h => h === 'NUMERO');

        if (nomeIndex === -1 || numeroIndex === -1) {
            setError('CSV deve ter colunas NOME e NUMERO');
            return [];
        }

        // Parse data rows
        const parsedContacts: Contact[] = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length >= 2) {
                parsedContacts.push({
                    cpf: cpfIndex >= 0 ? values[cpfIndex] || '' : '',
                    nome: values[nomeIndex] || '',
                    numero: values[numeroIndex] || '',
                    status: 'pending'
                });
            }
        }

        return parsedContacts;
    }, []);

    // Handle file upload
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError(null);
        setFileName(file.name);
        setResults(null);
        setProgress(0);

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const parsed = parseCSV(text);
            setContacts(parsed);
        };
        reader.readAsText(file);
    };

    // Clear file
    const clearFile = () => {
        setContacts([]);
        setFileName(null);
        setResults(null);
        setProgress(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Start blast
    const startBlast = async () => {
        // Filter out empty messages
        const validMessages = messages.filter(m => m.trim() !== '');
        
        if (!selectedInbox || validMessages.length === 0 || contacts.length === 0) {
            setError('Selecione um inbox, digite pelo menos uma mensagem e faça upload dos contatos');
            return;
        }

        const selectedInboxData = inboxes.find(i => i.id === selectedInbox);
        if (selectedInboxData?.liveStatus !== 'connected') {
            setError('O inbox selecionado não está conectado');
            return;
        }

        setIsBlasting(true);
        setError(null);
        setResults(null);
        setProgress(0);

        try {
            const response = await fetch('/api/baileys/blast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    connectionId: selectedInbox,
                    messages: validMessages, // Send array of messages
                    contacts,
                    delayMin: delayMin * 1000,
                    delayMax: delayMax * 1000
                })
            });

            const data = await response.json();

            if (data.success) {
                setResults({
                    sent: data.summary.sent,
                    failed: data.summary.failed
                });
                // Update contacts with results
                setContacts(data.results);
                setProgress(100);
            } else {
                setError(data.error || 'Erro ao processar disparos');
            }
        } catch (err: any) {
            setError(err.message || 'Erro de conexão');
        } finally {
            setIsBlasting(false);
        }
    };

    // Download sample CSV
    const downloadSampleCSV = () => {
        const csv = 'CPF,NOME,NUMERO\n4214124124,Juan,24992822790\n12345678901,Maria,61996740830';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'modelo_contatos.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const selectedInboxData = inboxes.find(i => i.id === selectedInbox);
    const isConnected = selectedInboxData?.liveStatus === 'connected';
    const validMessages = messages.filter(m => m.trim() !== '');
    const canStart = selectedInbox && validMessages.length > 0 && contacts.length > 0 && isConnected && !isBlasting;

    const validContacts = contacts.filter(c => c.status !== 'failed' || !c.error?.includes('inválido'));
    const invalidContacts = contacts.filter(c => c.error?.includes('inválido'));

    return (
        <div className={styles.blastGrid}>
            {/* Left Column: Configuration */}
            <div className={styles.leftCol}>
                {/* 1. Select Inbox */}
                <div className={styles.card}>
                    <div className={styles.cardTitle}>1. Selecionar Inbox</div>
                    
                    {inboxes.length === 0 ? (
                        <div className={styles.emptyState}>
                            <WifiOff size={32} />
                            <p>Nenhum inbox disponível. Crie um inbox primeiro.</p>
                        </div>
                    ) : (
                        <div className={styles.inboxList}>
                            {inboxes.map((inbox) => (
                                <div
                                    key={inbox.id}
                                    className={`${styles.inboxOption} ${selectedInbox === inbox.id ? styles.selected : ''} ${inbox.liveStatus !== 'connected' ? styles.disabled : ''}`}
                                    onClick={() => inbox.liveStatus === 'connected' && setSelectedInbox(inbox.id)}
                                >
                                    {inbox.liveStatus === 'connected' ? (
                                        <Wifi size={16} color="#10B981" />
                                    ) : inbox.liveStatus === 'connecting' ? (
                                        <Loader2 size={16} color="#F59E0B" className={styles.spin} />
                                    ) : (
                                        <WifiOff size={16} color="#94A3B8" />
                                    )}
                                    <div className={styles.inboxInfo}>
                                        <span className={styles.inboxName}>{inbox.displayName}</span>
                                        {inbox.phoneNumber && (
                                            <span className={styles.inboxPhone}>{inbox.phoneNumber}</span>
                                        )}
                                    </div>
                                    {inbox.liveStatus !== 'connected' && (
                                        <span className={styles.inboxStatus}>Desconectado</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 2. Message */}
                <div className={styles.card}>
                    <div className={styles.cardTitle}>
                        2. Mensagens ({validMessages.length} de {messages.length})
                        {messages.length < 20 && (
                            <button 
                                className={styles.addMessageBtn}
                                onClick={addMessage}
                                disabled={isBlasting}
                                title="Adicionar mensagem"
                            >
                                <Plus size={14} />
                                Adicionar
                            </button>
                        )}
                    </div>
                    
                    <div className={styles.messagesContainer}>
                        {messages.map((msg, index) => (
                            <div key={index} className={styles.messageItem}>
                                <div className={styles.messageHeader}>
                                    <span className={styles.messageNumber}>Msg {index + 1}</span>
                                    {messages.length > 1 && (
                                        <button 
                                            className={styles.removeMessageBtn}
                                            onClick={() => removeMessage(index)}
                                            disabled={isBlasting}
                                            title="Remover mensagem"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                                <textarea
                                    className={styles.messageInput}
                                    placeholder={`Mensagem ${index + 1}...&#10;&#10;Variáveis: {{NOME}}, {{CPF}}`}
                                    value={msg}
                                    onChange={(e) => updateMessage(index, e.target.value)}
                                    disabled={isBlasting}
                                    rows={3}
                                />
                            </div>
                        ))}
                    </div>
                    
                    <div className={styles.tip}>
                        <AlertCircle size={14} />
                        <span>
                            <strong>Múltiplas mensagens:</strong> Cada contato recebe uma mensagem aleatória diferente. 
                            Isso ajuda a evitar bloqueios por padrão repetitivo.
                        </span>
                    </div>
                </div>

                {/* 3. Upload */}
                <div className={styles.card}>
                    <div className={styles.cardTitle}>
                        3. Upload de Contatos
                        <button 
                            className={styles.downloadSample}
                            onClick={downloadSampleCSV}
                            title="Baixar modelo CSV"
                        >
                            <Download size={14} />
                            Modelo
                        </button>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />

                    {!fileName ? (
                        <div 
                            className={styles.uploadZone}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <UploadCloud size={48} />
                            <div className={styles.uploadText}>Clique para fazer upload</div>
                            <div className={styles.uploadSub}>Arquivo .CSV com colunas CPF, NOME, NUMERO</div>
                        </div>
                    ) : (
                        <div className={styles.fileInfo}>
                            <div className={styles.fileHeader}>
                                <FileSpreadsheet size={24} />
                                <div>
                                    <div className={styles.fileName}>{fileName}</div>
                                    <div className={styles.fileStats}>
                                        {contacts.length} contato(s) • {validContacts.length} válido(s)
                                        {invalidContacts.length > 0 && (
                                            <span className={styles.invalidCount}>
                                                • {invalidContacts.length} inválido(s)
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    className={styles.clearBtn}
                                    onClick={clearFile}
                                    disabled={isBlasting}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            {/* Preview Table */}
                            {contacts.length > 0 && (
                                <div className={styles.tableContainer}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>Nome</th>
                                                <th>Número</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {contacts.slice(0, 10).map((contact, idx) => (
                                                <tr key={idx} className={contact.status === 'failed' ? styles.failedRow : ''}>
                                                    <td>{contact.nome}</td>
                                                    <td>{contact.numero}</td>
                                                    <td>
                                                        {contact.status === 'sent' ? (
                                                            <span className={styles.statusSent}>
                                                                <CheckCircle2 size={12} /> Enviado
                                                            </span>
                                                        ) : contact.status === 'failed' ? (
                                                            <span className={styles.statusFailed} title={contact.error}>
                                                                <XCircle size={12} /> Falhou
                                                            </span>
                                                        ) : (
                                                            <span className={styles.statusPending}>Pendente</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {contacts.length > 10 && (
                                        <div className={styles.moreContacts}>
                                            + {contacts.length - 10} contato(s) não exibido(s)
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Execution */}
            <div className={styles.rightCol}>
                {/* Delay Settings */}
                <div className={styles.card}>
                    <div className={styles.cardTitle}>⏱️ Configuração de Delay</div>
                    
                    <div className={styles.delaySettings}>
                        <div className={styles.delayInput}>
                            <label>Mínimo (seg)</label>
                            <input
                                type="number"
                                min="10"
                                max="300"
                                value={delayMin}
                                onChange={(e) => setDelayMin(Math.max(10, parseInt(e.target.value) || 35))}
                                disabled={isBlasting}
                            />
                        </div>
                        <span className={styles.delayDash}>—</span>
                        <div className={styles.delayInput}>
                            <label>Máximo (seg)</label>
                            <input
                                type="number"
                                min="10"
                                max="300"
                                value={delayMax}
                                onChange={(e) => setDelayMax(Math.max(delayMin, parseInt(e.target.value) || 180))}
                                disabled={isBlasting}
                            />
                        </div>
                    </div>
                    
                    <div className={styles.tipSmall}>
                        ⏳ Delay 100% aleatório entre {delayMin}s e {delayMax}s ({Math.floor(delayMax/60)}min) — sem padrão para evitar detecção
                    </div>
                </div>

                {/* Execution */}
                <div className={styles.card}>
                    <div className={styles.cardTitle}>🚀 Execução</div>

                    <div className={styles.summary}>
                        <div className={styles.summaryItem}>
                            <span>Total na fila:</span>
                            <strong>{contacts.length}</strong>
                        </div>
                        <div className={styles.summaryItem}>
                            <span>Inbox:</span>
                            <strong>{selectedInboxData?.displayName || 'Não selecionado'}</strong>
                        </div>
                    </div>

                    {error && (
                        <div className={styles.errorMessage}>
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <button
                        className={styles.startBtn}
                        onClick={startBlast}
                        disabled={!canStart}
                        data-variant={variant}
                    >
                        {isBlasting ? (
                            <>
                                <Loader2 size={18} className={styles.spin} />
                                Enviando...
                            </>
                        ) : (
                            <>
                                Iniciar Disparos
                                <Send size={18} />
                            </>
                        )}
                    </button>
                </div>

                {/* Monitoring */}
                <div className={`${styles.card} ${!isBlasting && !results ? styles.cardDisabled : ''}`}>
                    <div className={styles.cardTitle}>📊 Monitoramento</div>

                    <div className={styles.progressContainer}>
                        <div className={styles.progressLabel}>
                            <span>Progresso</span>
                            <span>{results ? '100' : progress}%</span>
                        </div>
                        <div className={styles.progressBarBg}>
                            <div 
                                className={styles.progressBarFill} 
                                style={{ width: `${results ? 100 : progress}%` }}
                                data-variant={variant}
                            />
                        </div>
                    </div>

                    {results && (
                        <div className={styles.resultsGrid}>
                            <div className={styles.resultItem}>
                                <div className={styles.resultValue} style={{ color: '#10B981' }}>
                                    {results.sent}
                                </div>
                                <div className={styles.resultLabel}>Enviados</div>
                            </div>
                            <div className={styles.resultItem}>
                                <div className={styles.resultValue} style={{ color: '#EF4444' }}>
                                    {results.failed}
                                </div>
                                <div className={styles.resultLabel}>Falhas</div>
                            </div>
                        </div>
                    )}

                    {isBlasting && (
                        <div className={styles.blastingInfo}>
                            <Loader2 size={14} className={styles.spin} />
                            Processando... Não feche esta página.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

