import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { Category } from '../types';

interface CategoryFilterProps {
    expenseCategories: Category[];
    incomeCategories: Category[];
    selected: string[];
    onChange: (next: string[]) => void;
}

// Filtro de categorías con selección múltiple (checkboxes en un desplegable).
export const CategoryFilter: React.FC<CategoryFilterProps> = ({ expenseCategories, incomeCategories, selected, onChange }) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Cerrar al hacer click fuera
    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const toggle = (name: string) => {
        if (selected.includes(name)) {
            onChange(selected.filter(c => c !== name));
        } else {
            onChange([...selected, name]);
        }
    };

    const label = selected.length === 0
        ? 'Todas las Categorías'
        : selected.length === 1
            ? selected[0]
            : `${selected.length} categorías`;

    const renderGroup = (title: string, cats: Category[]) => (
        cats.length > 0 && (
            <div className="py-1">
                <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{title}</p>
                {cats.map(c => {
                    const checked = selected.includes(c.name);
                    return (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => toggle(c.name)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700/60 transition-colors text-left"
                        >
                            <span className={`flex items-center justify-center w-4 h-4 rounded border ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}>
                                {checked && <Check size={12} className="text-white" />}
                            </span>
                            <span className="truncate">{c.name}</span>
                        </button>
                    );
                })}
            </div>
        )
    );

    return (
        <div ref={containerRef} className="relative w-full">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-3 text-xs text-white w-full flex items-center justify-between gap-2"
            >
                <span className={`truncate ${selected.length === 0 ? 'text-slate-400' : 'text-white'}`}>{label}</span>
                <div className="flex items-center gap-1 shrink-0">
                    {selected.length > 0 && (
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); onChange([]); }}
                            className="text-slate-400 hover:text-white"
                            aria-label="Limpiar categorías"
                        >
                            <X size={14} />
                        </span>
                    )}
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {open && (
                <div className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto bg-slate-800 border border-slate-600 rounded-lg shadow-xl">
                    {renderGroup('Ingresos', incomeCategories)}
                    {renderGroup('Gastos', expenseCategories)}
                </div>
            )}
        </div>
    );
};
