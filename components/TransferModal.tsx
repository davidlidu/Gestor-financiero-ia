import React, { useState } from 'react';
import { X, ArrowRight, PiggyBank, Check, Wallet } from 'lucide-react';
import { formatMoney } from '../utils/format';
import { SavingsGoal } from '../types';

type TransferDirection = 'to_savings' | 'from_savings';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  savingsGoals: SavingsGoal[];
  onTransfer: (goalId: string, amount: number) => void;
  onTransferFromSavings: (goalId: string, amount: number) => void;
  currentBalance: number;
}

export const TransferModal: React.FC<Props> = ({
  isOpen,
  onClose,
  savingsGoals,
  onTransfer,
  onTransferFromSavings,
  currentBalance,
}) => {
  const [direction, setDirection] = useState<TransferDirection>('to_savings');
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');

  const selectedGoal = savingsGoals.find(g => g.id === selectedGoalId);
  const maxAmount = direction === 'to_savings' ? currentBalance : (selectedGoal?.currentAmount ?? 0);
  const numAmount = parseFloat(amount) || 0;
  const exceedsMax = amount !== '' && numAmount > maxAmount;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setDisplayAmount('');
      setAmount('');
      return;
    }
    const rawValue = val.replace(/\./g, '').replace(/,/g, '');
    if (!isNaN(Number(rawValue))) {
      setAmount(rawValue);
      setDisplayAmount(formatMoney(Number(rawValue)));
    }
  };

  const handleDirectionChange = (dir: TransferDirection) => {
    setDirection(dir);
    setSelectedGoalId('');
    setAmount('');
    setDisplayAmount('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalId || !amount || exceedsMax) return;
    if (direction === 'to_savings') {
      onTransfer(selectedGoalId, numAmount);
    } else {
      onTransferFromSavings(selectedGoalId, numAmount);
    }
    setAmount('');
    setDisplayAmount('');
    setSelectedGoalId('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-700 overflow-hidden">

        <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-850">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <PiggyBank className="text-primary-500" /> Transferir Fondos
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* Direction Toggle */}
          <div className="flex rounded-xl overflow-hidden border border-slate-700 bg-slate-900/50">
            <button
              type="button"
              onClick={() => handleDirectionChange('to_savings')}
              className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                direction === 'to_savings'
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wallet size={13} /> Billetera → Ahorro
            </button>
            <button
              type="button"
              onClick={() => handleDirectionChange('from_savings')}
              className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                direction === 'from_savings'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PiggyBank size={13} /> Ahorro → Billetera
            </button>
          </div>

          {/* Flow Visualization */}
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 flex flex-col gap-3">
            {direction === 'to_savings' ? (
              <>
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
              </>
            ) : (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 flex items-center gap-2">
                    <PiggyBank size={14} /> Desde Ahorro
                  </span>
                  <span className="text-white font-bold tracking-wide">
                    {selectedGoal ? `$${formatMoney(selectedGoal.currentAmount)}` : '—'}
                  </span>
                </div>
                <div className="flex justify-center text-slate-600">
                  <ArrowRight size={16} className="rotate-90" />
                </div>
                <div className="text-center text-sm text-blue-400 font-medium">
                  Hacia Billetera (${formatMoney(currentBalance)})
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              {direction === 'to_savings' ? 'Selecciona la Meta Destino' : 'Selecciona la Meta Origen'}
            </label>
            <select
              value={selectedGoalId}
              onChange={(e) => setSelectedGoalId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-primary-500 appearance-none"
              required
            >
              <option value="">-- Seleccionar Meta --</option>
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
            {exceedsMax && (
              <p className="text-xs text-red-400 mt-1">
                * El monto excede el saldo disponible (${formatMoney(maxAmount)}).
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!selectedGoalId || !amount || exceedsMax}
            className={`w-full disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all ${
              direction === 'to_savings'
                ? 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/20'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
            }`}
          >
            <Check size={18} /> Confirmar Transferencia
          </button>
        </form>
      </div>
    </div>
  );
};