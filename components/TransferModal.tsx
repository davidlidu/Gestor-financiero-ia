import React, { useState } from 'react';
import { X, ArrowRight, PiggyBank, Check, Wallet } from 'lucide-react';
import { formatMoney } from '../utils/format';
import { SavingsGoal } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  savingsGoals: SavingsGoal[];
  onTransfer: (goalId: string, amount: number) => void;
  currentBalance: number; // <--- Nuevo Prop recibido
}

export const TransferModal: React.FC<Props> = ({ isOpen, onClose, savingsGoals, onTransfer, currentBalance }) => {
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [amount, setAmount] = useState('');

  // Estado visual para el input con puntos
  const [displayAmount, setDisplayAmount] = useState('');

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setDisplayAmount('');
      setAmount('');
      return;
    }

    // Limpiamos puntos para guardar el número real
    const rawValue = val.replace(/\./g, '').replace(/,/g, '');
    if (!isNaN(Number(rawValue))) {
      setAmount(rawValue);
      setDisplayAmount(formatMoney(Number(rawValue)));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGoalId && amount) {
      const numAmount = parseFloat(amount);
      if (numAmount > currentBalance) {
        alert("Fondos insuficientes en la billetera.");
        return;
      }
      onTransfer(selectedGoalId, numAmount);

      // Limpiar estados
      setAmount('');
      setDisplayAmount('');
      setSelectedGoalId('');
      // El cierre lo maneja el padre al terminar la operación
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-700 overflow-hidden">

        <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-850">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <PiggyBank className="text-primary-500" /> Transferir a Ahorros
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* Visualización del Flujo */}
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 flex flex-col gap-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400 flex items-center gap-2">
                <Wallet size={14} /> Desde Billetera
              </span>
              <span className="text-white font-bold tracking-wide">
                ${formatMoney(currentBalance)}
              </span>
            </div>

            <div className="flex justify-center text-slate-600">
              <ArrowRight size={16} className="rotate-90" />
            </div>

            <div className="text-center text-sm text-primary-400 font-medium">
              Hacia Meta de Ahorro
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Selecciona la Meta</label>
            <select
              value={selectedGoalId}
              onChange={(e) => setSelectedGoalId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-primary-500 appearance-none"
              required
            >
              <option value="">-- Seleccionar Destino --</option>
              {savingsGoals.map(goal => (
                <option key={goal.id} value={goal.id}>
                  {goal.name} (Saldo: ${formatMoney(goal.currentAmount)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Monto a Transferir</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-500">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={displayAmount}
                onChange={handleAmountChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-6 pr-3 py-3 text-white focus:outline-none focus:border-primary-500 text-lg font-bold"
                placeholder="0"
                required
              />
            </div>
            {amount && parseFloat(amount) > currentBalance && (
              <p className="text-xs text-red-400 mt-1">* El monto excede tu saldo disponible.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!selectedGoalId || !amount || parseFloat(amount) > currentBalance}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 transition-all"
          >
            <Check size={18} /> Confirmar Transferencia
          </button>
        </form>
      </div>
    </div>
  );
};