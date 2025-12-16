import React, { useState } from 'react';
import { X, ArrowRight, PiggyBank, Check } from 'lucide-react';
import { SavingsGoal } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  savingsGoals: SavingsGoal[];
  onTransfer: (goalId: string, amount: number) => void;
}

export const TransferModal: React.FC<Props> = ({ isOpen, onClose, savingsGoals, onTransfer }) => {
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGoalId && amount) {
      onTransfer(selectedGoalId, parseFloat(amount));
      setAmount('');
      setSelectedGoalId('');
      onClose();
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
          <div className="flex flex-col items-center justify-center space-y-2 mb-4">
             <div className="text-sm text-slate-400">Desde Billetera Principal</div>
             <ArrowRight className="text-slate-500 rotate-90" />
             <div className="text-sm text-primary-400 font-medium">Hacia Meta de Ahorro</div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Selecciona la Meta</label>
            <select 
              value={selectedGoalId}
              onChange={(e) => setSelectedGoalId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-primary-500"
              required
            >
              <option value="">-- Seleccionar Meta --</option>
              {savingsGoals.map(goal => (
                <option key={goal.id} value={goal.id}>
                  {goal.name} (Actual: ${goal.currentAmount.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Monto a Transferir</label>
            <div className="relative">
                <span className="absolute left-3 top-3 text-slate-500">$</span>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-6 pr-3 py-3 text-white focus:outline-none focus:border-primary-500 text-lg font-bold"
                  placeholder="0.00"
                  required
                  min="1"
                />
            </div>
          </div>

          <button 
            type="submit"
            disabled={!selectedGoalId || !amount}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
          >
            <Check size={18} /> Confirmar Transferencia
          </button>
        </form>
      </div>
    </div>
  );
};