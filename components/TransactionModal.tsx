import React, { useState, useRef, useEffect } from 'react';
import { Camera, Mic, Upload, X, Loader2, Check, Banknote, ArrowRightLeft } from 'lucide-react';
import { Transaction, TransactionType, Category } from '../types'; // Asegúrate de importar Category
import { GeminiService } from '../services/geminiService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: Transaction | null;
  expenseCategories: Category[]; // <--- CAMBIO: Ahora recibe objetos Category
  incomeCategories: Category[];  // <--- CAMBIO: Ahora recibe objetos Category
}

export const TransactionModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData,
  expenseCategories,
  incomeCategories
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'ocr' | 'voice'>('manual');
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('transfer');

  // Media State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Update default category when type changes or categories load
  useEffect(() => {
    // Verificamos si la categoría actual existe en la lista de objetos por su nombre
    const currentList = type === 'expense' ? expenseCategories : incomeCategories;
    const exists = currentList.some(c => c.name === category);

    if (!category || !exists) {
        if (currentList.length > 0) {
            setCategory(currentList[0].name); // Usamos .name
        }
    }
  }, [type, expenseCategories, incomeCategories, category]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setAmount(initialData.amount.toString());
        setDescription(initialData.description);
        setCategory(initialData.category);
        setType(initialData.type);
        setDate(initialData.date);
        setPaymentMethod(initialData.paymentMethod || 'transfer');
        setActiveTab('manual');
      } else {
        // Reset form for new entry
        setAmount('');
        setDescription('');
        setType('expense');
        // Seleccionamos el nombre de la primera categoría disponible
        setCategory(expenseCategories[0]?.name || '');
        setDate(new Date().toISOString().split('T')[0]);
        setPaymentMethod('transfer');
        setActiveTab('manual');
      }
      setLoading(false);
    }
  }, [isOpen, initialData, expenseCategories]);

  const handleSave = () => {
    onSave({
      amount: parseFloat(amount),
      description: description || 'Sin descripción',
      category, // Enviamos el nombre (string)
      type,
      date,
      paymentMethod,
      method: initialData ? initialData.method : activeTab
    });
    onClose();
  };

  // --- OCR Logic ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        const result = await GeminiService.processReceipt(base64);
        
        // Auto-fill form
        if (result.amount) setAmount(result.amount.toString());
        if (result.description) setDescription(result.description);
        if (result.category) {
            // Buscamos coincidencia en los objetos por nombre
            const match = expenseCategories.find(c => 
                c.name.toLowerCase().includes(result.category.toLowerCase())
            );
            setCategory(match ? match.name : (expenseCategories[0]?.name || ''));
        }
        if (result.date) setDate(result.date);
        setType('expense');
        setActiveTab('manual');
      } catch (err) {
        alert("Error al procesar la imagen. Intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // --- Voice Logic ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        setLoading(true);
        const blob = new Blob(chunksRef.current, { type: 'audio/mp3' }); 
        
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
             const base64 = reader.result as string;
             try {
                const result = await GeminiService.processVoiceNote(base64);
                
                if (result.amount) setAmount(result.amount.toString());
                if (result.description) setDescription(result.description);
                if (result.category) {
                     const list = result.type === 'income' ? incomeCategories : expenseCategories;
                     const match = list.find(c => c.name.toLowerCase().includes(result.category.toLowerCase()));
                     setCategory(match ? match.name : (list[0]?.name || ''));
                }
                if (result.type) setType(result.type as TransactionType);
                setActiveTab('manual');
             } catch (e) {
                alert("No se entendió el audio.");
             } finally {
                setLoading(false);
             }
        };
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      alert("Permiso de micrófono denegado.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-700 overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">{initialData ? 'Editar Movimiento' : 'Nuevo Movimiento'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Tabs - Only show in Create Mode */}
        {!initialData && (
          <div className="flex p-2 gap-2 bg-slate-900/50">
            <button 
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'manual' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Manual
            </button>
            <button 
              onClick={() => setActiveTab('ocr')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex justify-center items-center gap-2 ${activeTab === 'ocr' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Camera size={16} /> Escanear
            </button>
            <button 
              onClick={() => setActiveTab('voice')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex justify-center items-center gap-2 ${activeTab === 'voice' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Mic size={16} /> Voz
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 min-h-[300px] flex flex-col justify-center">
          {loading ? (
             <div className="flex flex-col items-center gap-4 text-slate-300">
                <Loader2 size={48} className="animate-spin text-primary-500" />
                <p>Analizando con IA...</p>
             </div>
          ) : (
            <>
              {(activeTab === 'manual' || initialData) && (
                <div className="space-y-4">
                  {/* Type Selector */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Tipo de Movimiento</label>
                    <div className="flex bg-slate-900 rounded-lg p-1">
                      <button onClick={() => setType('income')} className={`flex-1 py-2 text-sm rounded-md transition-all ${type === 'income' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Ingreso</button>
                      <button onClick={() => setType('expense')} className={`flex-1 py-2 text-sm rounded-md transition-all ${type === 'expense' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Gasto</button>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Método de Pago</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => setPaymentMethod('transfer')}
                            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${paymentMethod === 'transfer' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                        >
                            <ArrowRightLeft size={16} /> Transferencia
                        </button>
                        <button 
                            onClick={() => setPaymentMethod('cash')}
                            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${paymentMethod === 'cash' ? 'bg-green-600/20 border-green-500 text-green-400' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                        >
                            <Banknote size={16} /> Efectivo
                        </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Monto</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-slate-500">$</span>
                            <input 
                                type="number" 
                                value={amount} 
                                onChange={e => setAmount(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-6 pr-3 py-2 text-white focus:outline-none focus:border-primary-500"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Fecha</label>
                        <input 
                        type="date" 
                        value={date} 
                        onChange={e => setDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                        />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Categoría</label>
                    <select 
                      value={category} 
                      onChange={e => setCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                    >
                      {/* --- CORRECCIÓN CLAVE: Iteramos sobre los objetos y usamos c.name --- */}
                      {(type === 'expense' ? expenseCategories : incomeCategories).map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Descripción <span className="text-slate-600">(opcional)</span></label>
                    <input 
                      type="text" 
                      value={description} 
                      onChange={e => setDescription(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                      placeholder="Ej: Compra en Supermercado"
                    />
                  </div>

                  <button 
                    onClick={handleSave} 
                    disabled={!amount}
                    className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg mt-4 flex items-center justify-center gap-2"
                  >
                    <Check size={18} /> {initialData ? 'Actualizar' : 'Guardar'} Movimiento
                  </button>
                </div>
              )}

              {/* ... OCR and Voice content remains the same ... */}
              {!initialData && activeTab === 'ocr' && (
                <div className="flex flex-col items-center justify-center text-center gap-6 py-8">
                  <div className="relative group cursor-pointer">
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-32 h-32 rounded-full bg-slate-700 flex items-center justify-center group-hover:bg-slate-600 transition-colors border-2 border-dashed border-slate-500">
                      <Camera size={48} className="text-primary-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium text-white">Toma una foto de tu factura</p>
                    <p className="text-sm text-slate-400 max-w-xs">La IA leerá automáticamente el comercio, la fecha y el total.</p>
                  </div>
                </div>
              )}

              {!initialData && activeTab === 'voice' && (
                <div className="flex flex-col items-center justify-center text-center gap-6 py-8">
                  <button 
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse border-2 border-red-500' : 'bg-slate-700 hover:bg-slate-600 text-primary-400 border-2 border-transparent'}`}
                  >
                    <Mic size={48} />
                  </button>
                  <div className="space-y-2">
                    <p className="font-medium text-white">{isRecording ? 'Escuchando...' : 'Toca para hablar'}</p>
                    <p className="text-sm text-slate-400 max-w-xs">
                        Di algo como: <br/> 
                        <span className="italic text-slate-300">"Gasté 50 mil en gasolina hoy"</span>
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};