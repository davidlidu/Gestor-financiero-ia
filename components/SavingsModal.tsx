import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { SavingsGoal } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: Partial<SavingsGoal>) => void;
  initialData?: SavingsGoal | null;
}

const PRESET_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const SavingsModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setTargetAmount(initialData.targetAmount.toString());
        setCurrentAmount(initialData.currentAmount.toString());
        setColor(initialData.color);
      } else {
        setName('');
        setTargetAmount('');
        setCurrentAmount('0');
        setColor(PRESET_COLORS[0]);
      }
    }
  }, [isOpen, initialData]);

  const handleSave = () => {
    onSave({
      name,
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount),
      color
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-700 overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">{initialData ? 'Editar Ahorro' : 'Nueva Meta de Ahorro'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Nombre de la Meta</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
              placeholder="Ej: Viaje a Europa"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Meta ($)</label>
              <input 
                type="number" 
                value={targetAmount} 
                onChange={e => setTargetAmount(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Ahorrado ($)</label>
              <input 
                type="number" 
                value={currentAmount} 
                onChange={e => setCurrentAmount(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Color</label>
            <div className="flex gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <button 
            onClick={handleSave} 
            disabled={!name || !targetAmount}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg mt-4 flex items-center justify-center gap-2"
          >
            <Check size={18} /> {initialData ? 'Actualizar Meta' : 'Crear Meta'}
          </button>
        </div>
      </div>
    </div>
  );
};