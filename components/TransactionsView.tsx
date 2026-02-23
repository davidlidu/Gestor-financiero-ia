import React from 'react';
import { Download, ArrowRightLeft, Trash2, Search } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Transaction, Category } from '../types';
import { formatMoney } from '../utils/format';

interface TransactionsViewProps {
    filteredTransactions: Transaction[];
    categories: Category[];
    onEditTransaction: (t: Transaction) => void;
    onDeleteTransaction: (id: string) => void;
    onExportCSV: () => void;
    onOpenTransferModal: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
    filteredTransactions,
    categories,
    onEditTransaction,
    onDeleteTransaction,
    onExportCSV,
    onOpenTransferModal
}) => {
    return (
        <div className="space-y-4">
            <div className="flex justify-end gap-2">
                <button
                    onClick={onExportCSV}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                    title="Descargar CSV con los filtros actuales"
                >
                    <Download size={16} /> Exportar CSV
                </button>
                <button
                    onClick={onOpenTransferModal}
                    className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/50 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                >
                    <ArrowRightLeft size={16} /> Enviar a Ahorros
                </button>
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold">Historial de Movimientos</h3>
                    <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-700">{filteredTransactions.length} registros</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        {/* Cabecera oculta en móvil para ahorrar espacio y evitar desalineación */}
                        <thead className="bg-slate-900/50 text-xs uppercase font-medium hidden md:table-header-group">
                            <tr>
                                <th className="px-6 py-4">Fecha / Categoría</th>
                                <th className="px-6 py-4">Notas / Método</th>
                                <th className="px-6 py-4 text-right">Monto</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {filteredTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-8 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-500">
                                            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-slate-700 shadow-inner">
                                                <Search size={28} className="text-slate-400 opacity-50" />
                                            </div>
                                            <p className="text-base font-bold text-slate-300">No se encontraron movimientos</p>
                                            <p className="text-sm mt-1 max-w-sm mx-auto">Intenta ajustar los filtros de búsqueda o agrega un nuevo movimiento para verlos aquí.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {filteredTransactions.map((t) => {
                                // 1. Lógica segura para iconos
                                const categoryObj = categories.find(c => c.name === t.category);
                                const IconToRender = categoryObj
                                    ? (LucideIcons as any)[categoryObj.icon]
                                    : (t.category === 'Ahorro' ? LucideIcons.PiggyBank : LucideIcons.HelpCircle);

                                // 2. Formateo de Fecha (Ej: 18 DIC)
                                const cleanDate = typeof t.date === 'string'
                                    ? t.date.substring(0, 10)
                                    : new Date(t.date).toISOString().substring(0, 10);

                                const [yearStr, monthStr, dayStr] = cleanDate.split('-');
                                const monthNames = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
                                const monthIndex = parseInt(monthStr) - 1;

                                return (
                                    <tr
                                        key={t.id}
                                        onClick={() => onEditTransaction(t)} // CLICK EN TODA LA FILA PARA EDITAR
                                        className="hover:bg-slate-700/30 transition-colors cursor-pointer group relative"
                                    >
                                        {/* CELDA ÚNICA EN MÓVIL (Usamos Block layout) */}
                                        <td className="p-4 md:px-6 md:py-4 block md:table-cell">
                                            <div className="flex items-center justify-between md:justify-start gap-3">
                                                <div className="flex items-center gap-3">
                                                    {/* Fecha */}
                                                    <div className="flex flex-col items-center justify-center bg-slate-800 p-2 rounded-lg border border-slate-700 min-w-[50px] h-[50px]">
                                                        <span className="text-lg font-bold text-white leading-none">{dayStr}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{monthNames[monthIndex]}</span>
                                                    </div>
                                                    {/* Info Principal */}
                                                    <div className="flex flex-col">
                                                        <span className={`text-sm font-medium ${t.category === 'Ahorro' ? 'text-blue-400' : 'text-slate-200'}`}>
                                                            {t.category}
                                                        </span>
                                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                                            {t.description || 'Sin notas'} • {t.paymentMethod === 'cash' ? 'Efectivo' : 'Banco'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* EN MÓVIL: El monto va a la derecha en la misma línea visual */}
                                                <div className="md:hidden text-right">
                                                    <span className={`block font-bold text-base ${t.category === 'Ahorro' ? 'text-blue-400' : (t.type === 'income' ? 'text-emerald-400' : 'text-red-400')}`}>
                                                        {t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Columnas ocultas en móvil */}
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <div className="flex gap-2 text-xs text-slate-500">
                                                <span className="bg-slate-800 px-2 py-1 rounded">{t.method === 'ocr' ? 'Auto' : 'Manual'}</span>
                                            </div>
                                        </td>

                                        <td className={`px-6 py-4 text-right font-bold text-lg hidden md:table-cell ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}
                                        </td>

                                        <td className="px-6 py-4 text-center hidden md:table-cell">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDeleteTransaction(t.id); }} // Stop propagation para que no abra editar
                                                className="text-slate-500 hover:text-red-400 p-2 rounded-full hover:bg-slate-800"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
