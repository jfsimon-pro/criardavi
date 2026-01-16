'use client';

import React from 'react';
import styles from './page.module.css';
import Sidebar from '@/components/Sidebar/Sidebar';
import TopBar from '@/components/TopBar/TopBar';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';

// Mock Data for September 2025
// Starting from Aug 31 (Sun) to Oct 04 (Sat) for a 5-row grid usually, or just filling the days.
// Screenshot shows:
// Row 1: 25(Aug) ... 01(Sep)
// Row 2: 02 ... 08 -> Event "Agenda Lotada" spanning 05-08? Or just placed there. It looks like a single block.
// Row 3: 09 ... 15 -> 13-15 "Reunião com a equipe"
// Row 4: 16 ... 23 -> 16-20 "Treinamento de vendas"
// Row 5: 24 ... 30 -> 27-30 "Cobrar pagamentos"

const calendarDays = [
    // Week 1
    { date: 25, isCurrentMonth: false },
    { date: 26, isCurrentMonth: false },
    { date: 27, isCurrentMonth: false },
    { date: 28, isCurrentMonth: false },
    { date: 29, isCurrentMonth: false },
    { date: 30, isCurrentMonth: false },
    { date: 1, isCurrentMonth: true },

    // Week 2
    { date: 2, isCurrentMonth: true },
    { date: 3, isCurrentMonth: true },
    { date: 4, isCurrentMonth: true },
    { date: 5, isCurrentMonth: true, event: { title: 'Agenda Lotada', type: 'eventBlue', icon: 'D' } },
    { date: 6, isCurrentMonth: true, eventSpanPlaceholder: true }, // Placeholder for span visualization logic (simplified here)
    { date: 7, isCurrentMonth: true, eventSpanPlaceholder: true },
    { date: 8, isCurrentMonth: true, eventSpanPlaceholder: true },

    // Week 3
    { date: 9, isCurrentMonth: true },
    { date: 10, isCurrentMonth: true },
    { date: 11, isCurrentMonth: true },
    { date: 12, isCurrentMonth: true },
    { date: 13, isCurrentMonth: true, event: { title: 'Reunião com a equipe', type: 'eventGreen', icon: 'M' } },
    { date: 14, isCurrentMonth: true, eventSpanPlaceholder: true },
    { date: 15, isCurrentMonth: true, eventSpanPlaceholder: true },

    // Week 4
    { date: 16, isCurrentMonth: true, event: { title: 'Treinamento de vendas', type: 'eventTeal', icon: 'F' } },
    { date: 17, isCurrentMonth: true, eventSpanPlaceholder: true },
    { date: 18, isCurrentMonth: true, eventSpanPlaceholder: true },
    { date: 19, isCurrentMonth: true, eventSpanPlaceholder: true }, // Correction: Print spans across row break potentially? No, 16-20 is same row.
    { date: 20, isCurrentMonth: true, eventSpanPlaceholder: true },
    { date: 21, isCurrentMonth: true },
    { date: 22, isCurrentMonth: true },

    // Week 5
    { date: 23, isCurrentMonth: true }, // The screenshot shows 23 at end of row 4 actually. Recalculating standard calendar.
    // Standard Sept 2025: Sep 1 is Monday. 
    // Screenshot shows Sep 01 is Saturday! 
    // Let's stick to the screenshot's visual data rather than real calendar correctness if they clash, 
    // OR just assume the screenshot is a mock and I should probably render a visually similar grid.
    // Screenshot: 
    // Row 1 ends with 01 (Saturday). So 01 is Sat.
    // Row 2 starts with 02 (Sunday).
    // This matches Aug 2024 (Aug 1 is Thu... no).
    // Let's just blindly follow the grid cells from the screenshot.
    // Row 5 continued...
    { date: 24, isCurrentMonth: true },
    { date: 25, isCurrentMonth: true },
    { date: 26, isCurrentMonth: true },
    { date: 27, isCurrentMonth: true, event: { title: 'Cobrar pagamentos', type: 'eventOrange', icon: 'S' } },
    { date: 28, isCurrentMonth: true, eventSpanPlaceholder: true },
    { date: 29, isCurrentMonth: true, eventSpanPlaceholder: true },
    { date: 30, isCurrentMonth: true, eventSpanPlaceholder: true },
];

// Refined grid based on screenshot specifically
// Row 1: Sun 25 .. Sat 01
// Row 2: Sun 02 .. Sat 08 (Event starts Wed 05 spans to Sat 08)
// Row 3: Sun 09 .. Sat 15 (Event starts Thu 13 spans to Sat 15)
// Row 4: Sun 16 .. Sat 23 (Wait, 16..23 is 8 days. 16,17,18,19,20,21,22,23. That's 8. Screenshot has 7 cols.
// Let's re-read screenshot carefully.
// Row 4: 16 17 18 20 21 22 23 (19 is missing? or "Treinamento" covers it). Actually it seems 16, 17, 18, 20 is weird numbering.
// Let's ignore exact date math and just make the grid look good.

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

export default function AgendaPage() {
    return (
        <div style={{ minHeight: '100vh', paddingLeft: 250, backgroundColor: 'var(--bg-page)' }}>
            <Sidebar />

            <main style={{ padding: '32px 40px' }}>
                <TopBar />

                {/* Header */}
                <div className={styles.topHeader}>
                    <h1 className={styles.pageTitle}>Agenda</h1>
                </div>

                {/* Calendar Wrapper */}
                <div className={styles.calendarControls}>
                    <div className={styles.currentMonth}>Setembro 2025</div>
                    <div className={styles.navGroup}>
                        <button className={styles.navBtn}><ChevronLeft size={16} /></button>
                        <button className={styles.navBtn}>Mês</button>
                        <button className={styles.navBtn}><ChevronRight size={16} /></button>
                    </div>
                </div>

                <div className={styles.calendarContainer}>
                    {/* Lock Overlay */}
                    <div className={styles.lockOverlay}>
                        <Lock size={48} strokeWidth={2} />
                    </div>

                    {/* Week Header */}
                    <div className={styles.weekHeader}>
                        {weekDays.map(day => (
                            <div key={day} className={styles.weekDay}>{day}</div>
                        ))}
                    </div>

                    {/* Grid */}
                    <div className={styles.grid}>
                        {/* Row 1 */}
                        {[25, 26, 27, 28, 29, 30].map(d => <DayCell key={d} day={d} other />)}
                        <DayCell day={1} />

                        {/* Row 2 */}
                        <DayCell day={2} />
                        <DayCell day={3} />
                        <DayCell day={4} />
                        {/* Event Spanning 4 days */}
                        <div className={styles.dayCell} style={{ gridColumn: 'span 4', backgroundColor: '#E0F2FE', borderRight: 'none', padding: '8px' }}>
                            <div className={styles.dayNumber} style={{ justifyContent: 'space-between', display: 'flex', width: '100%' }}>
                                <span style={{ color: '#94A3B8' }}>05</span>
                                <span style={{ color: '#94A3B8' }}>08</span>
                            </div>
                            <div className={`${styles.eventPill} ${styles.eventBlue}`} style={{ background: 'transparent' }}>
                                <div className={styles.eventIcon}>D</div>
                                Agenda Lotada
                            </div>
                        </div>

                        {/* Row 3 */}
                        <DayCell day={9} />
                        <DayCell day={10} />
                        <DayCell day={11} />
                        <DayCell day={12} />
                        {/* Event Spanning 3 days */}
                        <div className={styles.dayCell} style={{ gridColumn: 'span 3', backgroundColor: '#DCFCE7', padding: '8px' }}>
                            <div className={styles.dayNumber} style={{ justifyContent: 'space-between', display: 'flex', width: '100%' }}>
                                <span style={{ color: '#94A3B8' }}>13</span>
                                <span style={{ color: '#94A3B8' }}>15</span>
                            </div>
                            <div className={`${styles.eventPill} ${styles.eventGreen}`} style={{ background: 'transparent' }}>
                                <div className={styles.eventIcon}>M</div>
                                Reunião com a equipe
                            </div>
                        </div>

                        {/* Row 4 */}
                        {/* Event Spanning 5 days 16-20 */}
                        <div className={styles.dayCell} style={{ gridColumn: 'span 5', backgroundColor: '#CCFBF1', borderRight: '1px solid #E2E8F0', padding: '8px' }}>
                            <div className={styles.dayNumber} style={{ justifyContent: 'space-between', display: 'flex', width: '100%' }}>
                                <span style={{ color: '#94A3B8' }}>16</span>
                                <span style={{ color: '#94A3B8' }}>20</span>
                            </div>
                            <div className={`${styles.eventPill} ${styles.eventTeal}`} style={{ background: 'transparent' }}>
                                <div className={styles.eventIcon}>F</div>
                                Treinamento de vendas
                            </div>
                        </div>
                        <DayCell day={21} />
                        <DayCell day={22} />

                        {/* Row 5 */}
                        <DayCell day={23} />
                        <DayCell day={24} />
                        <DayCell day={25} />
                        <DayCell day={26} />
                        {/* Event Spanning 6 days 27-30? Screenshot ends at 30. */}
                        <div className={styles.dayCell} style={{ gridColumn: 'span 3', backgroundColor: '#FFF7ED', borderRight: 'none', padding: '8px' }}>
                            <div className={styles.dayNumber} style={{ justifyContent: 'space-between', display: 'flex', width: '100%' }}>
                                <span style={{ color: '#94A3B8' }}>27</span>
                                <span style={{ color: '#94A3B8' }}>30</span>
                            </div>
                            <div className={`${styles.eventPill} ${styles.eventOrange}`} style={{ background: 'transparent' }}>
                                <div className={styles.eventIcon}>S</div>
                                Cobrar pagamentos
                            </div>
                        </div>

                    </div>
                </div>

            </main>
        </div>
    );
}

function DayCell({ day, other = false }: { day: number, other?: boolean }) {
    return (
        <div className={`${styles.dayCell} ${other ? styles.otherMonth : ''}`}>
            <div className={styles.dayNumber}>{day < 10 ? `0${day}` : day}</div>
        </div>
    );
}
