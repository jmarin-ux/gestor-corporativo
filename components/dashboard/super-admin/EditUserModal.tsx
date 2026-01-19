'use client';

import { useState, useEffect } from 'react';
import { 
  X, Save, User, Mail, Shield, Briefcase, 
  Loader2, CheckCircle2, AlertTriangle 
} from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';

export default function EditUserModal({ isOpen, onClose, user, onUpdate }: any) {
  const [loading, setLoading] = useState(false);
  
  // Formulario
  const [formData, setFormData] = useState({
    full_name: '',
    email: '', // El email suele ser read-only porque está ligado a Auth
    role: '',
    position: '', // Cargo (ej: Líder de Mantenimiento)
    phone: ''
  });

  // Cargar datos al abrir
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        role: user.role || 'operativo',
        position: user.position || '', // Asegúrate de que tu tabla tenga esta columna o usa 'job_title'
        phone: user.phone || ''
      });
    }
  }, [isOpen, user]);

  const handleSave = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // 1. Actualizar en la tabla profiles
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          role: formData.role, // Aquí cambiamos el rol (superadmin, coordinador, etc)
          position: formData.position,
          phone: formData.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      alert("✅ Usuario actualizado correctamente");
      if (onUpdate) onUpdate();
      onClose();

    } catch (e: any) {
      console.error(e);
      alert("Error al actualizar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
        
        {/* HEADER */}
        <div className="bg-[#0a1e3f] p-6 flex justify-between items-center text-white">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Editar Personal</h2>
            <p className="text-[10px] text-blue-200 font-bold uppercase mt-1">ID: {user?.id?.slice(0,8)}</p>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"><X size={20}/></button>
        </div>

        {/* BODY */}
        <div className="p-8 space-y-6">
            
            {/* Nombre */}
            <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Nombre Completo</label>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                    <input 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-xs font-bold text-slate-700 outline-none focus:border-[#0a1e3f] uppercase transition-all"
                        value={formData.full_name}
                        onChange={(e) => setFormData({...formData, full_name: e.target.value.toUpperCase()})}
                    />
                </div>
            </div>

            {/* Email (Solo Lectura) */}
            <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Correo Electrónico (Sistema)</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                    <input 
                        disabled
                        className="w-full bg-slate-100 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-xs font-bold text-slate-500 outline-none cursor-not-allowed"
                        value={formData.email}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* ROL */}
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Rol de Sistema</label>
                    <div className="relative">
                        <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18}/>
                        <select 
                            className="w-full bg-indigo-50/50 border border-indigo-100 rounded-xl py-3 pl-12 pr-4 text-xs font-black text-indigo-900 outline-none focus:border-indigo-500 uppercase cursor-pointer appearance-none"
                            value={formData.role}
                            onChange={(e) => setFormData({...formData, role: e.target.value})}
                        >
                            <option value="operativo">Operativo</option>
                            <option value="coordinador">Coordinador</option>
                            <option value="admin">Administrador</option>
                            <option value="superadmin">Super Admin</option>
                            <option value="kiosk_master">Kiosco Master</option>
                        </select>
                    </div>
                </div>

                {/* CARGO / POSICIÓN */}
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Cargo / Puesto</label>
                    <div className="relative">
                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18}/>
                        <input 
                            className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl py-3 pl-12 pr-4 text-xs font-bold text-emerald-900 outline-none focus:border-emerald-500 uppercase transition-all"
                            placeholder="EJ: LIDER, AUXILIAR..."
                            value={formData.position}
                            onChange={(e) => setFormData({...formData, position: e.target.value.toUpperCase()})}
                        />
                    </div>
                </div>
            </div>

            {/* AVISO */}
            <div className="bg-amber-50 p-4 rounded-xl flex gap-3 items-center border border-amber-100">
                <AlertTriangle className="text-amber-500 shrink-0" size={20}/>
                <p className="text-[10px] text-amber-700 font-bold leading-tight">
                    ATENCIÓN: Cambiar el rol modificará inmediatamente los permisos de acceso de este usuario.
                </p>
            </div>

        </div>

        {/* FOOTER */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-3 rounded-xl text-xs font-black text-slate-400 hover:bg-slate-200 uppercase transition-colors">Cancelar</button>
            <button 
                onClick={handleSave} 
                disabled={loading}
                className="bg-[#0a1e3f] text-white px-8 py-3 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-blue-900 transition-all flex items-center gap-2 disabled:opacity-50"
            >
                {loading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} 
                Guardar Cambios
            </button>
        </div>

      </div>
    </div>
  );
}