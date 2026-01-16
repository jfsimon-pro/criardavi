'use client';

import React from 'react';
import styles from './Dashboard.module.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import TopBar from '@/components/TopBar/TopBar';
import { Search, Calendar, MoreHorizontal, Check, ChevronRight, ChevronLeft, ChevronDown, Lock } from 'lucide-react';
import {
    AreaChart, Area, ResponsiveContainer,
    LineChart, Line
} from 'recharts';

// --- Mock Data (with more wave variation) ---
const sparklineData1 = [
    { v: 20 }, { v: 25 }, { v: 22 }, { v: 28 }, { v: 24 }, { v: 30 }, { v: 26 }, { v: 32 }, { v: 28 }, { v: 35 }, { v: 30 }, { v: 38 }
];
const sparklineData2 = [
    { v: 15 }, { v: 18 }, { v: 16 }, { v: 20 }, { v: 17 }, { v: 22 }, { v: 19 }, { v: 25 }, { v: 21 }, { v: 28 }, { v: 24 }, { v: 30 }
];
const sparklineData3 = [
    { v: 35 }, { v: 32 }, { v: 34 }, { v: 30 }, { v: 33 }, { v: 28 }, { v: 31 }, { v: 26 }, { v: 29 }, { v: 24 }, { v: 27 }, { v: 22 }
];

const mainChartData = [
    { u: 30 }, { u: 45 }, { u: 40 }, { u: 50 }, { u: 70 },
    { u: 55 }, { u: 85 }, { u: 75 }, { u: 90 }, { u: 80 }
];

// Helper to create SVG Arcs
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
    var angleInRadians = (angleInDegrees - 180) * Math.PI / 180.0;
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
    var start = polarToCartesian(x, y, radius, endAngle);
    var end = polarToCartesian(x, y, radius, startAngle);
    var largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    var d = [
        "M", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
    return d;
}

export default function DashboardPage() {
    return (
        <div className={styles.dashboardLayout}>
            <Sidebar />

            <main className={styles.mainContent}>
                <TopBar />

                {/* Header Control Row */}
                <div className={styles.headerRow}>
                    <div className={styles.periodSelector}>
                        <Calendar size={18} />
                        <span>Período Visualizado: 20 Dezembro 2024</span>
                    </div>

                    <div className={styles.searchWrapper}>
                        <Search className={styles.searchIcon} size={18} />
                        <input type="text" placeholder="Procurar" className={styles.searchInput} />
                    </div>
                </div>

                {/* Top Stats Grid */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statHeader}>
                            <span className={styles.statTitle}>Total Leads</span>
                            <span className={`${styles.statChange} ${styles.positive}`}>↑ 10%</span>
                        </div>
                        <div className={styles.statValue}>6.780</div>
                        <div style={{ width: '100%', height: 40 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={sparklineData1}>
                                    <Line type="natural" dataKey="v" stroke="#4ADE80" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statHeader}>
                            <span className={styles.statTitle}>Novos Leads</span>
                            <span className={`${styles.statChange} ${styles.positive}`}>↑ 16%</span>
                        </div>
                        <div className={styles.statValue}>1.364</div>
                        <div style={{ width: '100%', height: 40 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={sparklineData2}>
                                    <Line type="natural" dataKey="v" stroke="#4ADE80" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statHeader}>
                            <span className={styles.statTitle}>Total conversão</span>
                            <span className={`${styles.statChange} ${styles.negative}`}>↓ 8%</span>
                        </div>
                        <div className={styles.statValue}>12.924</div>
                        <div style={{ width: '100%', height: 40 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={sparklineData3}>
                                    <Line type="natural" dataKey="v" stroke="#F87171" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Main 3-Col Content Grid */}
                <div className={styles.mainGrid}>

                    {/* Column 1: Charts */}
                    <div className={styles.column}>
                        {/* Wave Chart Card */}
                        <div className={styles.card}>
                            <div className={styles.lockOverlay}>
                                <Lock size={48} strokeWidth={2} />
                            </div>
                            <div className={styles.cardHeader}>
                                <span className={styles.cardTitle}>Conversas resolvidas por IA</span>
                            </div>
                            <div style={{ width: '100%', height: 200, position: 'relative' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={mainChartData}>
                                        <defs>
                                            <linearGradient id="colorU" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#4ADE80" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <Area type="natural" dataKey="u" stroke="#4ADE80" strokeWidth={3} fillOpacity={1} fill="url(#colorU)" />
                                    </AreaChart>
                                </ResponsiveContainer>

                                {/* Hardcoded '85' Badge */}
                                <div style={{
                                    position: 'absolute',
                                    top: '25%',
                                    left: '60%',
                                    transform: 'translate(-50%, -50%)',
                                    backgroundColor: '#1E293B',
                                    color: 'white',
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem',
                                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                }}>
                                    85
                                </div>
                                <div style={{
                                    position: 'absolute',
                                    top: '38%',
                                    left: '60%',
                                    width: '12px',
                                    height: '12px',
                                    backgroundColor: '#1E293B',
                                    borderRadius: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    border: '2px solid white'
                                }}></div>
                            </div>
                        </div>

                        {/* Funnel Gauge Card (Segmented) */}
                        <div className={styles.card}>
                            <div className={styles.lockOverlay}>
                                <Lock size={48} strokeWidth={2} />
                            </div>
                            <div className={`${styles.cardHeader} ${styles.centeredHeader}`}>
                                <span className={styles.cardTitle}>Funil Padrão</span>
                                <ChevronDown size={20} color="#1E293B" />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                {/* Gauge SVG */}
                                <div style={{ position: 'relative', width: '220px', height: '130px' }}>
                                    <svg width="220" height="130" viewBox="0 0 220 130">
                                        {/* Segment 1: Blue (Left, Conversões) 0-45 degrees */}
                                        <path d={describeArc(110, 120, 80, 0, 45)} fill="none" stroke="#BFDBFE" strokeWidth="20" />

                                        {/* Segment 2: Purple (Middle, Leads) 45-135 degrees */}
                                        <path d={describeArc(110, 120, 80, 45, 135)} fill="none" stroke="#D8B4FE" strokeWidth="20" />

                                        {/* Segment 3: Pink (Right, Conversas) 135-180 degrees */}
                                        <path d={describeArc(110, 120, 80, 135, 180)} fill="none" stroke="#FBCFE8" strokeWidth="20" />
                                    </svg>

                                    <div style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -10%)',
                                        textAlign: 'center'
                                    }}>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 600, color: '#1E293B', lineHeight: '1.2' }}>150 %</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Taxa de Conversão</div>
                                    </div>
                                </div>

                                <div className={styles.gaugeStats}>
                                    <div className={styles.gaugeRow}>
                                        <span className={styles.gaugeRowLabel}>Conversas Iniciadas</span>
                                        <span className={styles.gaugePill} style={{ backgroundColor: '#FBCFE8', color: '#831843' }}>80</span>
                                    </div>
                                    <div className={styles.gaugeRow}>
                                        <span className={styles.gaugeRowLabel}>Leads interessados</span>
                                        <span className={styles.gaugePill} style={{ backgroundColor: '#E9D5FF', color: '#6B21A8' }}>30</span>
                                    </div>
                                    <div className={styles.gaugeRow}>
                                        <span className={styles.gaugeRowLabel}>Conversões</span>
                                        <span className={styles.gaugePill} style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}>42</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Calendar */}
                    <div className={styles.column}>
                        <div className={styles.card} style={{ height: '100%' }}>
                            <div className={styles.lockOverlay}>
                                <Lock size={48} strokeWidth={2} />
                            </div>
                            <div className={styles.calendarTitle}>Agenda</div>

                            <div className={styles.calendarControls}>
                                <div className={styles.calBtn}><ChevronLeft size={16} /></div>
                                <span>Março 2025</span>
                                <div className={styles.calBtn}><ChevronRight size={16} /></div>
                            </div>

                            <div className={styles.calGrid}>
                                <div className={styles.calDayHead}>Dom</div>
                                <div className={styles.calDayHead}>Seg</div>
                                <div className={styles.calDayHead}>Ter</div>
                                <div className={styles.calDayHead}>Qua</div>
                                <div className={styles.calDayHead}>Qui</div>
                                <div className={styles.calDayHead}>Sex</div>
                                <div className={styles.calDayHead}>Sab</div>

                                {/* Mock Days */}
                                <div className={`${styles.calDay}`} style={{ color: '#CBD5E1' }}>27</div>
                                <div className={`${styles.calDay}`} style={{ color: '#CBD5E1' }}>28</div>
                                <div className={styles.calDay}>1</div>
                                <div className={styles.calDay}>2</div>
                                <div className={styles.calDay}>3</div>
                                <div className={styles.calDay}>4</div>
                                <div className={styles.calDay}>5</div>

                                <div className={styles.calDay}>6</div>
                                <div className={styles.calDay}>7</div>
                                <div className={styles.calDay}>8</div>
                                <div className={styles.calDay}>9</div>
                                <div className={styles.calDay}>10</div>
                                <div className={styles.calDay}>11</div>
                                <div className={styles.calDay}>12</div>

                                <div className={styles.calDay}>13</div>
                                <div className={styles.calDay}>14</div>
                                <div className={`${styles.calDay} ${styles.active}`}>15</div>
                                <div className={styles.calDay}>16</div>
                                <div className={styles.calDay}>17</div>
                                <div className={styles.calDay}>18</div>
                                <div className={styles.calDay}>19</div>

                                <div className={styles.calDay}>20</div>
                                <div className={styles.calDay}>21</div>
                                <div className={styles.calDay}>22</div>
                                <div className={styles.calDay}>23</div>
                                <div className={styles.calDay}>24</div>
                                <div className={styles.calDay}>25</div>
                                <div className={styles.calDay}>26</div>

                                <div className={styles.calDay}>27</div>
                                <div className={styles.calDay}>28</div>
                                <div className={styles.calDay}>29</div>
                                <div className={styles.calDay}>30</div>
                                <div className={styles.calDay}>31</div>
                                <div className={`${styles.calDay}`} style={{ color: '#CBD5E1' }}>1</div>
                                <div className={`${styles.calDay}`} style={{ color: '#CBD5E1' }}>2</div>
                            </div>

                            <div className={styles.nextEvents}>
                                <div className={styles.agendaItem}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <b style={{ fontSize: '0.9rem' }}>Consulta Agendada</b>
                                        <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> 15 Mar • 16h30</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Column 3: Lists */}
                    <div className={styles.column}>
                        {/* Recent Chats */}
                        <div className={styles.card}>
                            <div className={styles.lockOverlay}>
                                <Lock size={48} strokeWidth={2} />
                            </div>
                            <div className={styles.cardHeader}>
                                <span className={styles.cardTitle}>Chats Recentes</span>
                                <MoreHorizontal size={20} color="#94A3B8" />
                            </div>
                            <div className={styles.list}>
                                <div className={styles.listItem}>
                                    <div className={styles.checkCircle}></div>
                                    <div className={styles.itemInfo}>
                                        <span className={styles.itemName}>João Calvin</span>
                                        <span className={styles.itemMeta}><Calendar size={14} /> 23 Mar</span>
                                    </div>
                                </div>
                                <div className={styles.listItem}>
                                    <div className={styles.checkCircle}></div>
                                    <div className={styles.itemInfo}>
                                        <span className={styles.itemName}>Maria Joaquina</span>
                                        <span className={styles.itemMeta}><Calendar size={14} /> 20 Mar</span>
                                    </div>
                                </div>
                                <div className={styles.listItem}>
                                    <div className={`${styles.checkCircle} ${styles.checked}`}><Check size={12} /></div>
                                    <div className={styles.itemInfo}>
                                        <span className={styles.itemName}>Wiran Correa</span>
                                        <span className={styles.itemMeta}><Calendar size={14} /> 12 Mar</span>
                                    </div>
                                </div>
                                <div className={styles.listItem}>
                                    <div className={`${styles.checkCircle} ${styles.checked}`}><Check size={12} /></div>
                                    <div className={styles.itemInfo}>
                                        <span className={styles.itemName}>Clara Marta</span>
                                        <span className={styles.itemMeta}><Calendar size={14} /> 16 Mar</span>
                                    </div>
                                </div>
                                <div className={styles.listItem}>
                                    <div className={`${styles.checkCircle} ${styles.checked}`} style={{ opacity: 0.5 }}><Check size={12} /></div>
                                    <div className={styles.itemInfo} style={{ opacity: 0.5 }}>
                                        <span className={styles.itemName}>Diego Lopes</span>
                                        <span className={styles.itemMeta}><Calendar size={14} /> 10 Mar</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Leads */}
                        <div className={styles.card}>
                            <div className={styles.lockOverlay}>
                                <Lock size={48} strokeWidth={2} />
                            </div>
                            <div className={styles.cardHeader}>
                                <span className={styles.cardTitle}>Leads Recentes</span>
                                <MoreHorizontal size={20} color="#94A3B8" />
                            </div>
                            <div className={styles.list}>
                                <div className={styles.listItem} style={{ border: 'none', borderBottom: '1px solid #f1f5f9', padding: '12px 0' }}>
                                    <div className={styles.itemAvatar} style={{ backgroundColor: '#CBD5E1' }}></div>
                                    <div className={styles.itemInfo}>
                                        <span className={styles.itemName}>Vitor Nolasco</span>
                                        <span className={styles.itemMeta}>61 982400709</span>
                                    </div>
                                    <ChevronRight className={styles.chevronRight} size={16} />
                                </div>
                                <div className={styles.listItem} style={{ border: 'none', borderBottom: '1px solid #f1f5f9', padding: '12px 0' }}>
                                    <div className={styles.itemAvatar} style={{ backgroundColor: '#E2E8F0' }}></div>
                                    <div className={styles.itemInfo}>
                                        <span className={styles.itemName}>Jaime Simon</span>
                                        <span className={styles.itemMeta}>61 984508798</span>
                                    </div>
                                    <ChevronRight className={styles.chevronRight} size={16} />
                                </div>
                                <div className={styles.listItem} style={{ border: 'none', padding: '12px 0' }}>
                                    <div className={styles.itemAvatar} style={{ backgroundColor: '#E2E8F0' }}></div>
                                    <div className={styles.itemInfo}>
                                        <span className={styles.itemName}>Matheus Felix</span>
                                        <span className={styles.itemMeta}>61 983476915</span>
                                    </div>
                                    <ChevronRight className={styles.chevronRight} size={16} />
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </main>
        </div>
    );
}
