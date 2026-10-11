import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bug, CheckCircle2, TrendingUp, Wallet } from 'lucide-react';
import { Transaction } from '../types';
import { formatMoney } from '../utils/format';

interface Props {
    month: string; // YYYY-MM
    transactions: Transaction[];
    // Presupuestos del mes ya con lo gastado en cada categoría
    stats: { categoryName: string; amount: number; spent: number }[];
}

type Tone = 'bad' | 'warn' | 'good';

// Valor corto para los ejes del gráfico: 1.2M, 350k
const short = (n: number) => {
    const a = Math.abs(n);
    if (a >= 1e6) return `$${(n / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })}M`;
    if (a >= 1e3) return `$${Math.round(n / 1e3)}k`;
    return `$${Math.round(n)}`;
};

const toneClasses: Record<Tone, string> = {
    bad: 'bg-danger-50 dark:bg-danger-500/10 border-danger-500/30 text-danger-600 dark:text-danger-500',
    warn: 'bg-amber-50 dark:bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400',
    good: 'bg-brand-50 dark:bg-brand-500/10 border-brand-500/30 text-brand-600 dark:text-brand-400',
};

// Resumen del presupuesto del mes: cuánto llevas, qué tan comprometido está tu ingreso,
// qué debes vigilar y si vas al ritmo del plan. Todo se calcula de los movimientos y presupuestos existentes.
export const BudgetInsights: React.FC<Props> = ({ month, transactions, stats }) => {
    const d = useMemo(() => {
        const [y, m] = month.split('-').map(Number);
        const days = new Date(y, m, 0).getDate();
        const monthTx = transactions.filter(t => t.date.startsWith(month));
        // "Ahorro" son traslados a/desde metas: ni ingreso ni gasto real
        const income = monthTx.filter(t => t.type === 'income' && t.category !== 'Ahorro').reduce((a, t) => a + t.amount, 0);
        const expenses = monthTx.filter(t => t.type === 'expense' && t.category !== 'Ahorro');
        const totalExpense = expenses.reduce((a, t) => a + t.amount, 0);

        const planned = stats.reduce((a, s) => a + s.amount, 0);
        const spent = stats.reduce((a, s) => a + s.spent, 0);

        // Gasto hormiga: categoría con muchos gastos pequeños (4+ veces y promedio bajo frente al ingreso)
        const byCat = new Map<string, { n: number; total: number }>();
        expenses.forEach(t => {
            const c = byCat.get(t.category) || { n: 0, total: 0 };
            c.n += 1; c.total += t.amount;
            byCat.set(t.category, c);
        });
        const maxAvg = income > 0 ? income * 0.05 : 100000;
        const ant = [...byCat.entries()]
            .filter(([, v]) => v.n >= 4 && v.total / v.n <= maxAvg)
            .sort((a, b) => b[1].n - a[1].n)[0];

        // Gasto acumulado por día (solo categorías presupuestadas) frente al ritmo lineal ideal
        const budgeted = new Set(stats.map(s => s.categoryName));
        const daily = Array(days + 1).fill(0);
        expenses.filter(t => budgeted.has(t.category)).forEach(t => {
            const day = parseInt(t.date.substring(8, 10), 10);
            if (day >= 1 && day <= days) daily[day] += t.amount;
        });
        const now = new Date();
        const isCurrent = now.getFullYear() === y && now.getMonth() + 1 === m;
        const lastDay = isCurrent ? now.getDate() : days;
        const cum = [0];
        for (let i = 1; i <= days; i++) cum[i] = cum[i - 1] + daily[i];

        const over = stats.filter(s => s.spent > s.amount).sort((a, b) => (b.spent - b.amount) - (a.spent - a.amount));
        return { days, income, totalExpense, planned, spent, ant, cum, lastDay, isCurrent, over };
    }, [month, transactions, stats]);

    // El gráfico se dibuja al ancho real del contenedor: así el texto conserva su tamaño en cualquier pantalla
    // (con un viewBox fijo se estiraba hasta verse enorme en escritorio).
    const chartRef = useRef<HTMLDivElement>(null);
    const [chartW, setChartW] = useState(360);
    const hasPlan = d.planned > 0;
    useEffect(() => {
        const el = chartRef.current;
        if (!el) return;
        const update = () => setChartW(Math.max(280, Math.round(el.clientWidth)));
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [hasPlan]);

    const left = d.planned - d.spent;
    const ratio = d.planned > 0 ? d.spent / d.planned : 0;
    const barColor = ratio > 1 ? 'bg-danger-500' : ratio > 0.85 ? 'bg-orange-500' : 'bg-brand-500';
    const unassigned = d.income - d.planned;

    // --- Lo que debes saber ---
    const insights: { tone: Tone; icon: React.ReactNode; text: React.ReactNode }[] = [];
    if (d.over.length > 0) {
        const o = d.over[0];
        insights.push({
            tone: 'bad', icon: <AlertTriangle size={16} />,
            text: <>Donde más se te va la plata: <b>{o.categoryName}</b>. Presupuestaste ${formatMoney(o.amount)} y llevas ${formatMoney(o.spent)}: <b>${formatMoney(o.spent - o.amount)} de más</b>.</>,
        });
        if (d.over.length > 1) {
            insights.push({
                tone: 'bad', icon: <AlertTriangle size={16} />,
                text: <>Te pasaste en {d.over.length} categorías: {d.over.map(s => s.categoryName).join(', ')}.</>,
            });
        }
    }
    if (d.ant) {
        const [name, v] = d.ant;
        insights.push({
            tone: 'warn', icon: <Bug size={16} />,
            text: <>Gasto hormiga: <b>{name}</b>, {v.n} veces este mes. De a ${formatMoney(v.total / v.n)} parece poco, pero ya suma <b>${formatMoney(v.total)}</b>.</>,
        });
    }
    if (d.income > 0 && d.totalExpense > d.income) {
        insights.push({
            tone: 'bad', icon: <Wallet size={16} />,
            text: <>Ya gastaste más de lo que te entró este mes (${formatMoney(d.income)} de ingresos).</>,
        });
    }
    if (d.income > 0 && unassigned < 0) {
        insights.push({
            tone: 'warn', icon: <Wallet size={16} />,
            text: <>Presupuestaste ${formatMoney(-unassigned)} más de lo que te ha entrado este mes.</>,
        });
    }
    if (insights.length === 0) {
        insights.push({
            tone: 'good', icon: <CheckCircle2 size={16} />,
            text: <>Vas dentro del presupuesto en todas las categorías. ¡Así se hace!</>,
        });
    }

    // --- Ritmo de gasto (gráfico) ---
    const W = chartW, H = 200, L = 52, R = 12, T = 12, B = 26;
    const top = Math.max(d.planned, d.cum[d.days], 1) * 1.08;
    const x = (day: number) => L + (day / d.days) * (W - L - R);
    const y = (v: number) => T + (1 - v / top) * (H - T - B);
    let path = `M${x(0)},${y(0)}`;
    for (let i = 1; i <= d.lastDay; i++) path += ` L${x(i)},${y(d.cum[i])}`;
    const idealNow = d.planned * (d.lastDay / d.days);
    const spentNow = d.cum[d.lastDay];
    const faster = spentNow > idealNow;
    const xTicks = [1, 8, 15, 22, d.days];

    return (
        <div className="space-y-4 mb-8">
            {/* Resumen general */}
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="flex justify-between items-baseline gap-3 flex-wrap">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Llevas gastado <b className="text-slate-800 dark:text-white">${formatMoney(d.spent)}</b> de ${formatMoney(d.planned)} presupuestados
                    </p>
                    <p className={`text-sm font-bold ${left < 0 ? 'text-danger-500' : 'text-brand-500'}`}>
                        {left < 0 ? `Te pasaste por $${formatMoney(-left)}` : `Te quedan $${formatMoney(left)}`}
                    </p>
                </div>
                <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-3">
                    <div className={`h-full ${barColor} transition-all duration-700`} style={{ width: `${Math.min(ratio * 100, 100)}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 mt-1.5">
                    <span>{Math.round(ratio * 100)}% del presupuesto usado</span>
                    {d.income > 0 && (
                        <span>
                            {unassigned >= 0
                                ? `$${formatMoney(unassigned)} de tus ingresos sin asignar`
                                : 'Presupuesto mayor a tus ingresos'}
                        </span>
                    )}
                </div>
            </div>

            {/* Lo que debes saber */}
            <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Lo que debes saber</h4>
                <div className="space-y-2">
                    {insights.map((it, i) => (
                        <div key={i} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${toneClasses[it.tone]}`}>
                            <span className="mt-0.5 shrink-0">{it.icon}</span>
                            <p className="text-slate-700 dark:text-slate-200">{it.text}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Ritmo de gasto */}
            {d.planned > 0 && (
                <div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                        <TrendingUp size={15} className="text-brand-500" /> Tu ritmo de gasto
                    </h4>
                    <p className="text-xs text-slate-500 mb-2">
                        {d.isCurrent
                            ? (faster
                                ? `Vas más rápido de lo planeado: llevas $${formatMoney(spentNow)} y a esta altura del mes lo ideal sería $${formatMoney(idealNow)}.`
                                : `Vas dentro del ritmo: llevas $${formatMoney(spentNow)} y a esta altura del mes lo ideal sería $${formatMoney(idealNow)}.`)
                            : 'Si la línea verde va por encima de la punteada, gastaste más rápido de lo planeado.'}
                    </p>
                    <div ref={chartRef} className="w-full">
                    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" role="img" aria-label="Gasto acumulado frente al ritmo ideal del presupuesto">
                        {[0, 1, 2, 3, 4].map(i => {
                            const v = (top / 4) * i;
                            return (
                                <g key={i}>
                                    <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="stroke-slate-200 dark:stroke-slate-700" strokeWidth={1} />
                                    <text x={L - 5} y={y(v) + 3} textAnchor="end" fontSize={11} className="fill-slate-500">{short(v)}</text>
                                </g>
                            );
                        })}
                        {xTicks.map(day => (
                            <text key={day} x={x(day)} y={H - 8} textAnchor={day === d.days ? 'end' : 'middle'} fontSize={11} className="fill-slate-500">
                                {day === d.days ? `Día ${day}` : day}
                            </text>
                        ))}
                        {/* Ritmo ideal: de 0 al total presupuestado */}
                        <line x1={x(0)} y1={y(0)} x2={x(d.days)} y2={y(d.planned)} strokeWidth={2} strokeDasharray="5 5" className="stroke-slate-400" />
                        {/* Gasto acumulado */}
                        <path d={path} fill="none" strokeWidth={2.5} strokeLinejoin="round" className={faster ? 'stroke-danger-500' : 'stroke-brand-500'} />
                        <circle cx={x(d.lastDay)} cy={y(spentNow)} r={4} className={faster ? 'fill-danger-500' : 'fill-brand-500'} />
                    </svg>
                    </div>
                    <div className="flex items-center justify-center gap-5 text-[11px] text-slate-500 mt-1">
                        <span className="flex items-center gap-1.5"><span className={`w-3 h-0.5 ${faster ? 'bg-danger-500' : 'bg-brand-500'}`} /> Lo que llevas gastado</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 border-t-2 border-dashed border-slate-400" /> Ritmo ideal</span>
                    </div>
                </div>
            )}
        </div>
    );
};
