'use client';

import { useState, useEffect } from 'react';
import { Server, User, XCircle, Key, Lock, Eye, EyeOff } from 'lucide-react';

interface Props {
  user: any;
  kioskMasters: any[];
  currentUserRole: string;
  onClose: () => void;
  onSave: (action: 'update' | 'new', data: any) => Promise<void>;
  isProcessing: boolean;
}

export default function EditUserModal({ user, kioskMasters, currentUserRole, onClose, onSave, isProcessing }: Props) {
  const [formData, setFormData] = useState(user);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => { setFormData(user); }, [user]);

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-[#0a1e3f] p-6 flex justify-between items-center text-white">
                <h3 className="font-black uppercase tracking-tight flex items-center gap-2">
                    {formData.role === 'kiosk_master' ? <Server size={20}/> : <User size={20}/>} 
                    {formData.id === 'new' ? 'Crear Nuevo' : 'Editar'}
                </h3>
                <button onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-full transition"><XCircle size={20}/></button>
            </div>
            
            <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Nombre {formData.role === 'kiosk_master' ? 'del Kiosco / Sucursal' : 'Completo'}</label>
                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" 
                        value={formData.full_name || ''} 
                        onChange={e => handleChange('full_name', e.target.value)} 
                    />
                </div>
                
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Rol Asignado</label>
                    <input disabled className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 uppercase" value={formData.role} />
                </div>

                {formData.role === 'operativo' ? (
                    <>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 text-emerald-600"><Server size={10}/> Kiosco Asignado (Llave)</label>
                            <select 
                                className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none text-emerald-800 cursor-pointer"
                                value={formData.linked_kiosk_email || ''} 
                                onChange={e => handleChange('linked_kiosk_email', e.target.value)}
                            >
                                <option value="">-- Selecciona el Kiosco --</option>
                                {kioskMasters.map(k => (
                                    <option key={k.id} value={k.email}>{k.full_name} ({k.email})</option>
                                ))}
                            </select>
                            <p className="text-[9px] text-slate-400 ml-1">Este operativo solo aparecerá al ingresar con este correo.</p>
                        </div>
                        <div className="space-y-1 animate-in slide-in-from-top-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 text-slate-600"><Key size={10}/> PIN Personal</label>
                            <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" 
                                placeholder="Ej: 1234" 
                                value={formData.pin || ''} 
                                onChange={e => handleChange('pin', e.target.value)} 
                            />
                        </div>
                    </>
                ) : (
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Correo de Acceso</label>
                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" 
                            value={formData.email || ''} 
                            onChange={e => handleChange('email', e.target.value)} 
                        />
                    </div>
                )}

                {formData.type === 'client' && (
                    <div className="flex gap-4">
                        <div className="space-y-1 flex-1">
                            <label className="text-[10px] font-black uppercase text-slate-400">Empresa</label>
                            <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={formData.company || ''} onChange={e=>handleChange('company', e.target.value)} />
                        </div>
                        <div className="space-y-1 flex-1">
                            <label className="text-[10px] font-black uppercase text-slate-400">Puesto</label>
                            <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={formData.position || ''} onChange={e=>handleChange('position', e.target.value)} />
                        </div>
                        <div className="space-y-1 flex-1">
                            <label className="text-[10px] font-black uppercase text-slate-400">Teléfono</label>
                            <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={formData.phone || ''} onChange={e=>handleChange('phone', e.target.value)} />
                        </div>
                    </div>
                )}

                {formData.role !== 'operativo' && (
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><Lock size={10}/> Contraseña</label>
                        <div className="relative">
                            <input type={showPass ? "text" : "password"} 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" 
                                value={formData.password || ''} 
                                onChange={e => handleChange('password', e.target.value)} 
                                placeholder="••••••" 
                            />
                            <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-2.5 text-slate-400 hover:text-blue-600">
                                {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                            </button>
                        </div>
                    </div>
                )}

                <button 
                    onClick={() => onSave(formData.id === 'new' ? 'new' : 'update', formData)} 
                    disabled={isProcessing} 
                    className="w-full bg-[#0a1e3f] text-white py-3.5 rounded-xl font-black uppercase text-xs tracking-widest mt-4 hover:bg-blue-900 transition-colors"
                >
                    {formData.id === 'new' ? 'Crear Usuario' : 'Guardar Cambios'}
                </button>
            </div>
        </div>
    </div>
  );
}