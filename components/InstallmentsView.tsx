import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, CreditCard, Check, X, Calendar, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { Installment, InstallmentPayment } from '../types';
import { StorageService } from '../services/storageService';
import { formatMoney } from '../utils/format';

interface InstallmentsViewProps {
    onPayInstallment?: (installment: Installment, amount: number) => void;
}

const getLocalDate = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now.getTime() - offset);
    return localDate.toISOString().split('T')[0];
};

export const InstallmentsView: React.FC<InstallmentsViewProps> = ({ onPayInstallment }) => {
    const [installments, setInstallments] = useState<Installment[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [totalDebt, setTotalDebt] = useState('');
    const [totalInstallments, setTotalInstallments] = useState('');
    const [source, setSource] = useState('');
    const [startDate, setStartDate] = useState(getLocalDate());
    const [nextDueDate, setNextDueDate] = useState('');

    // Payment modal
    const [payingId, setPayingId] = useState<string | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [payDate, setPayDate] = useState(getLocalDate());

    // Expanded cards
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        loadInstallments();
    }, []);

    const loadInstallments = async () => {
        const data = await StorageService.getInstallments();
        setInstallments(data);
    };

    const monthlyAmount = useMemo(() => {
        const debt = parseFloat(totalDebt) || 0;
        const inst = parseInt(totalInstallments) || 1;
        return Math.ceil(debt / inst);
    }, [totalDebt, totalInstallments]);

    const resetForm = () => {
        setName(''); setTotalDebt(''); setTotalInstallments('');
        setSource(''); setStartDate(getLocalDate()); setNextDueDate('');
        setIsAdding(false); setEditingId(null);
    };

    const handleSave = async () => {
        if (!name || !totalDebt || !totalInstallments) return;

        const debt = parseFloat(totalDebt);
        const inst = parseInt(totalInstallments);
        const monthly = Math.ceil(debt / inst);

        const installment: any = {
            name,
            totalDebt: debt,
            totalInstallments: inst,
            monthlyAmount: monthly,
            source: source || 'Sin especificar',
            startDate,
            nextDueDate: nextDueDate || startDate,
        };

        if (editingId) {
            const existing = installments.find(i => i.id === editingId);
            installment.id = editingId;
            installment.payments = existing?.payments || [];
        }

        const updated = await StorageService.saveInstallment(installment);
        setInstallments(updated);
        resetForm();
    };

    const handleDelete = async (id: string) => {
        const updated = await StorageService.deleteInstallment(id);
        setInstallments(updated);
    };

    const handleEdit = (inst: Installment) => {
        setName(inst.name);
        setTotalDebt(inst.totalDebt.toString());
        setTotalInstallments(inst.totalInstallments.toString());
        setSource(inst.source);
        setStartDate(inst.startDate);
        setNextDueDate(inst.nextDueDate);
        setEditingId(inst.id);
        setIsAdding(true);
    };

    const handlePayment = async (installmentId: string) => {
        const amt = parseFloat(payAmount);
        if (!amt || amt <= 0) return;

        const inst = installments.find(i => i.id === installmentId);
        if (!inst) return;

        // Register the payment
        const updated = await StorageService.addInstallmentPayment(installmentId, {
            amount: amt,
            date: payDate
        });
        setInstallments(updated);

        // Also register as expense transaction via callback
        if (onPayInstallment) {
            onPayInstallment(inst, amt);
        }

        setPayingId(null);
        setPayAmount('');
        setPayDate(getLocalDate());
    };

    // Calculated totals
    const totalMonthly = installments.reduce((sum, inst) => {
        const paidCount = inst.payments?.length || 0;
        if (paidCount >= inst.totalInstallments) return sum; // Fully paid
        return sum + inst.monthlyAmount;
    }, 0);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <CreditCard size={22} className="text-emerald-400" /> Control de Cuotas
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">Rastrea tus compras a plazos</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
                    >
                        <Plus size={16} /> Nueva Cuota
                    </button>
                )}
            </div>

            {/* Monthly Total Banner */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-800/80 rounded-xl p-4 border border-slate-700 flex justify-between items-center">
                <div>
                    <p className="text-[10px] text-slate-500 uppercase font-medium">Total cuotas mensuales</p>
                    <p className="text-xs text-slate-400 mt-0.5">{installments.length} deuda{installments.length !== 1 ? 's' : ''} activa{installments.length !== 1 ? 's' : ''}</p>
                </div>
                <p className="text-2xl font-bold text-red-400">${formatMoney(totalMonthly)}</p>
            </div>

            {/* Add/Edit Form */}
            {isAdding && (
                <div className="bg-slate-800/80 rounded-xl border border-slate-700 p-5 space-y-4">
                    <h3 className="text-sm font-bold text-white">
                        {editingId ? 'Editar Cuota' : 'Nueva Cuota'}
                    </h3>

                    {/* Row 1: Name & Source */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] text-slate-500 uppercase font-medium mb-1">Nombre de la deuda</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Ej: PlayStation 5, Curso de inglés"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-500 uppercase font-medium mb-1">Fuente / Banco</label>
                            <input
                                type="text"
                                value={source}
                                onChange={e => setSource(e.target.value)}
                                placeholder="Ej: Nu Colombia, Falabella"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Row 2: Total debt, # installments, monthly preview */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[10px] text-slate-500 uppercase font-medium mb-1">Deuda Total ($)</label>
                            <input
                                type="number"
                                value={totalDebt}
                                onChange={e => setTotalDebt(e.target.value)}
                                placeholder="2.400.000"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-500 uppercase font-medium mb-1"># Cuotas</label>
                            <input
                                type="number"
                                value={totalInstallments}
                                onChange={e => setTotalInstallments(e.target.value)}
                                placeholder="12"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-500 uppercase font-medium mb-1">Valor/mes</label>
                            <div className="bg-slate-900/50 border border-emerald-500/30 rounded-lg px-3 py-2.5 text-emerald-400 font-bold text-sm">
                                ${formatMoney(monthlyAmount)}
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] text-slate-500 uppercase font-medium mb-1">Fecha inicio</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-500 uppercase font-medium mb-1">Próximo vencimiento</label>
                            <input
                                type="date"
                                value={nextDueDate}
                                onChange={e => setNextDueDate(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={resetForm}
                            className="flex-1 px-4 py-2.5 text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!name || !totalDebt || !totalInstallments}
                            className="flex-1 px-4 py-2.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                        >
                            <Check size={16} /> {editingId ? 'Actualizar' : 'Crear'} Cuota
                        </button>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {installments.length === 0 && !isAdding && (
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-12 text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                        <CreditCard size={28} className="text-slate-500" />
                    </div>
                    <p className="text-base font-bold text-slate-300">Sin cuotas activas</p>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                        Agrega tus compras a plazos para llevar control de los pagos mensuales.
                    </p>
                </div>
            )}

            {/* Installment Cards */}
            <div className="space-y-3">
                {installments.map(inst => {
                    const paidCount = inst.payments?.length || 0;
                    const totalPaid = (inst.payments || []).reduce((s, p) => s + p.amount, 0);
                    const progressPercent = inst.totalInstallments > 0
                        ? Math.min(Math.round((paidCount / inst.totalInstallments) * 100), 100)
                        : 0;
                    const remainingDebt = inst.totalDebt - totalPaid;
                    const isFullyPaid = paidCount >= inst.totalInstallments || remainingDebt <= 0;
                    const isExpanded = expandedId === inst.id;

                    // Due date formatting
                    const dueDate = new Date(inst.nextDueDate + 'T12:00:00');
                    const dueDateStr = `${String(dueDate.getDate()).padStart(2, '0')}/${String(dueDate.getMonth() + 1).padStart(2, '0')}`;

                    return (
                        <div
                            key={inst.id}
                            className={`bg-slate-800/80 rounded-xl border transition-all overflow-hidden ${isFullyPaid
                                    ? 'border-emerald-500/30 opacity-60'
                                    : 'border-slate-700/80'
                                }`}
                        >
                            <div className="p-4">
                                {/* Title row */}
                                <div className="flex justify-between items-start mb-1">
                                    <div>
                                        <h4 className="text-sm font-bold text-white">{inst.name}</h4>
                                        <p className="text-[10px] text-slate-500">
                                            {paidCount} de {inst.totalInstallments} pagadas
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleEdit(inst)}
                                            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(inst.id)}
                                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Source */}
                                {inst.source && (
                                    <p className="text-[10px] text-slate-600 flex items-center gap-1 mb-3">
                                        <CreditCard size={10} /> {inst.source}
                                    </p>
                                )}

                                {/* Progress bar */}
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ${isFullyPaid ? 'bg-emerald-500' : 'bg-emerald-500'
                                            }`}
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>

                                {/* Stats row */}
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-bold text-emerald-400">{progressPercent}%</span>
                                    <span className="text-[10px] text-slate-500">
                                        Próximo vencimiento: {dueDateStr}
                                    </span>
                                </div>

                                {/* Monthly amount + Pay button */}
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span className="text-xl font-bold text-white">${formatMoney(inst.monthlyAmount)}</span>
                                        <span className="text-xs text-slate-500">/mes</span>
                                    </div>

                                    {!isFullyPaid && payingId !== inst.id && (
                                        <button
                                            onClick={() => {
                                                setPayingId(inst.id);
                                                setPayAmount(inst.monthlyAmount.toString());
                                                setPayDate(getLocalDate());
                                            }}
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                                        >
                                            <Check size={14} /> Marcar como pagada
                                        </button>
                                    )}

                                    {isFullyPaid && (
                                        <span className="bg-emerald-500/15 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold">
                                            ✅ Liquidada
                                        </span>
                                    )}
                                </div>

                                {/* Payment form (inline) */}
                                {payingId === inst.id && (
                                    <div className="mt-4 bg-slate-900/50 border border-slate-700 rounded-lg p-3 space-y-3">
                                        <p className="text-xs font-bold text-slate-300">Registrar Pago</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[10px] text-slate-500 mb-1">Monto ($)</label>
                                                <input
                                                    type="number"
                                                    value={payAmount}
                                                    onChange={e => setPayAmount(e.target.value)}
                                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                                                    placeholder={inst.monthlyAmount.toString()}
                                                />
                                                <p className="text-[9px] text-slate-600 mt-0.5">
                                                    Cuota fija: ${formatMoney(inst.monthlyAmount)}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-slate-500 mb-1">Fecha</label>
                                                <input
                                                    type="date"
                                                    value={payDate}
                                                    onChange={e => setPayDate(e.target.value)}
                                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setPayingId(null); setPayAmount(''); }}
                                                className="flex-1 px-3 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={() => handlePayment(inst.id)}
                                                disabled={!payAmount || parseFloat(payAmount) <= 0}
                                                className="flex-1 px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                                            >
                                                <DollarSign size={12} /> Registrar Pago
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Expand/Collapse for payment history */}
                                {(inst.payments?.length || 0) > 0 && (
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : inst.id)}
                                        className="w-full mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                                    >
                                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                        {isExpanded ? 'Ocultar' : 'Ver'} historial de pagos ({inst.payments.length})
                                    </button>
                                )}
                            </div>

                            {/* Payment History (expandable) */}
                            {isExpanded && inst.payments && inst.payments.length > 0 && (
                                <div className="bg-slate-900/30 border-t border-slate-700/50 px-4 py-3 space-y-2">
                                    {inst.payments.map((p, idx) => {
                                        const pDate = new Date(p.date + 'T12:00:00');
                                        const pDateStr = pDate.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
                                        const isExtra = p.amount !== inst.monthlyAmount;

                                        return (
                                            <div key={p.id || idx} className="flex justify-between items-center text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="text-slate-400">{pDateStr}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-white">${formatMoney(p.amount)}</span>
                                                    {isExtra && (
                                                        <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-medium">
                                                            Extra
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {/* Summary */}
                                    <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-700/30 mt-2">
                                        <span className="text-slate-500">Total pagado</span>
                                        <span className="font-bold text-emerald-400">${formatMoney(totalPaid)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Restante</span>
                                        <span className={`font-bold ${remainingDebt > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                            ${formatMoney(Math.max(remainingDebt, 0))}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
