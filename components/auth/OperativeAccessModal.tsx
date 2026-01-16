'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HardHat, Delete, Loader2, X, Mail, ArrowRight, Users, ChevronLeft, ShieldCheck, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase'
interface Props { onClose: () => void; }
type Step = 'email' | 'password' | 'selection' | 'pin';

export default function OperativeAccessModal({ onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailNext = () => {
      setError('');
      if (!email.includes('@')) { setError('Ingresa un correo válido'); return; }
      setStep('password'); 
  };

  const handleMasterLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
        // 1. Validar la Llave Maestra (Kiosco)
        const { data: masterUser, error: masterError } = await supabase.from('profiles').select('*')
            .eq('email', email).eq('password', password).eq('role', 'kiosk_master').single();

        if (masterError || !masterUser) {
            setError('Credenciales incorrectas o no autorizadas.'); setLoading(false); return;
        }

        // 2. Buscar operativos vinculados a ESTE email (usando la nueva columna linked_kiosk_email)
        const { data, error } = await supabase.from('profiles').select('id, full_name, pin')
            .eq('role', 'operativo')
            .eq('linked_kiosk_email', email)
            .order('full_name');

        if (error) throw error;
        if (!data || data.length === 0) { setError('No hay personal asignado a este Kiosco.'); setLoading(false); return; }

        setStaffList(data); 
        setStep('selection'); 
    } catch (err) { 
        setError('Error de conexión.'); 
    } finally { 
        setLoading(false); 
    }
  };

  const handlePinSubmit = async () => {
    if (pin.length < 4) return; setLoading(true); setError('');
    if (selectedUser.pin === pin) {
        localStorage.setItem('kiosco_user', JSON.stringify(selectedUser));
        router.push('/dashboard'); 
    } else {
        setError('PIN incorrecto.'); setPin(''); setLoading(false);
    }
  };

  useEffect(() => { if (pin.length === 4 && step === 'pin') handlePinSubmit(); }, [pin]);
  const handleNumClick = (num: string) => { if (pin.length < 4) setPin(prev => prev + num); };
  const handleDelete = () => setPin(prev => prev.slice(0, -1));

  return (
    <div className="fixed inset-0 z-50 bg-[#020617]/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in p-4">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X size={32} /></button>
        
        <div className="w-full max-w-sm text-center relative">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-3xl mx-auto flex items-center justify-center mb-6 border border-emerald-500/20">
                {step === 'email' && <Mail size={32} />} 
                {step === 'password' && <Lock size={32} />} 
                {step === 'selection' && <Users size={32} />} 
                {step === 'pin' && <HardHat size={32} />}
            </div>
            
            <h2 className="text-2xl font-black uppercase text-white mb-2">
                {step === 'email' ? 'Paso 1: Correo' : 
                 step === 'password' ? 'Paso 2: Contraseña' : 
                 step === 'selection' ? 'Paso 3: Identidad' : 
                 `Hola, ${selectedUser?.full_name?.split(' ')[0]}`}
            </h2>
            
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">
                {step === 'pin' ? 'Ingresa tu PIN personal' : 'Ingresa tus credenciales de acceso'}
            </p>

            {error && <div className="text-red-400 text-xs font-bold bg-red-500/10 py-3 rounded-xl mb-6 border border-red-500/20">{error}</div>}

            {/* PASO 1: EMAIL */}
            {step === 'email' && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                    <input type="email" autoFocus className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 font-bold text-white outline-none focus:border-emerald-500 text-center" value={email} onChange={(e) => setEmail(e.target.value)}/>
                    <button onClick={handleEmailNext} disabled={!email} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold uppercase text-xs tracking-widest transition-all active:scale-95">Siguiente</button>
                </div>
            )}

            {/* PASO 2: CONTRASEÑA */}
            {step === 'password' && (
                <form onSubmit={handleMasterLogin} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                    <input type="password" autoFocus className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 font-bold text-white outline-none focus:border-emerald-500 text-center tracking-widest" value={password} onChange={(e) => setPassword(e.target.value)}/>
                    <button type="submit" disabled={loading || !password} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold uppercase text-xs tracking-widest transition-all active:scale-95">
                        {loading ? <Loader2 className="animate-spin mx-auto"/> : 'Verificar'}
                    </button>
                    <button type="button" onClick={() => setStep('email')} className="text-slate-500 hover:text-white text-xs font-bold uppercase mt-4 flex items-center justify-center gap-1 mx-auto transition-colors">
                        <ChevronLeft size={12}/> Volver
                    </button>
                </form>
            )}

            {/* PASO 3: SELECCIÓN DE IDENTIDAD */}
            {step === 'selection' && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                    <div className="relative">
                        <select 
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 text-center font-bold text-white outline-none focus:border-emerald-500 appearance-none cursor-pointer" 
                            onChange={(e) => {
                                const user = staffList.find(u => String(u.id) === String(e.target.value));
                                setSelectedUser(user || null);
                            }}
                            value={selectedUser?.id || ''}
                        >
                            <option value="" disabled>-- Seleccionar Identidad --</option>
                            {staffList.map(u => <option key={u.id} value={u.id} className="bg-slate-900">{u.full_name}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
                    </div>
                    <button 
                        onClick={() => selectedUser && setStep('pin')} 
                        disabled={!selectedUser} 
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold uppercase text-xs tracking-widest transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        Continuar
                    </button>
                    <button type="button" onClick={() => setStep('password')} className="text-slate-500 hover:text-white text-xs font-bold uppercase mt-4 flex items-center justify-center gap-1 mx-auto transition-colors">
                        <ChevronLeft size={12}/> Volver
                    </button>
                </div>
            )}

            {/* PASO 4: PIN */}
            {step === 'pin' && (
                <div className="animate-in slide-in-from-right-4 duration-300">
                    <div className="flex justify-center gap-4 mb-8">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className={`w-4 h-4 rounded-full transition-all duration-300 ${i < pin.length ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)] scale-110' : 'bg-slate-800 border border-slate-700'}`} />
                        ))}
                    </div>
                    <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                            <button key={num} onClick={() => handleNumClick(num.toString())} className="h-16 bg-slate-900 hover:bg-slate-800 rounded-2xl text-2xl font-bold text-white border border-white/5 active:scale-95 transition-all">
                                {num}
                            </button>
                        ))}
                        <button onClick={() => { setStep('selection'); setPin(''); }} className="h-16 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                            <ChevronLeft size={24}/>
                        </button>
                        <button onClick={() => handleNumClick('0')} className="h-16 bg-slate-900 hover:bg-slate-800 rounded-2xl text-2xl font-bold text-white border border-white/5 active:scale-95 transition-all">
                            0
                        </button>
                        <button onClick={handleDelete} className="h-16 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                            <Delete size={24}/>
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
}