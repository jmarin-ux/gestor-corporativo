'use client';

import { useState } from 'react';
import { X, Save, ShieldCheck, Lock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function EditUserModal({ 
  user, 
  currentUser, 
  onClose, 
  onSave, 
  isProcessing: externalProcessing 
}: any) {
  
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Cálculo de permisos según el usuario logueado
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isReadOnly = !isSuperAdmin;

  const [formData, setFormData] = useState({
    full_name: (user.full_name || '').toUpperCase(),
    role: user.role || 'operativo',
    technical_level: user.technical_level || 'auxiliar',
    email: user.email || '',
    phone: user.phone || '',
    password: user.password || '',
    pin: user.pin || '',
  });

  // Identificación del tipo de registro
  const isClient = user.type === 'client' || user.role === 'client' || user.role === 'cliente';

  const handleLocalSave = async () => {
    if (isReadOnly) return;

    setIsProcessing(true);
    try {
      const targetTable = isClient ? 'clients' : 'profiles';
      
      const updateData: any = {
        full_name: formData.full_name.toUpperCase(),
        phone: formData.phone,
        password: formData.password,
      };

      // 🔒 Solo staff tiene nivel técnico y PIN de kiosco
      // 🔒 El rol solo se actualiza si NO es cliente (evita inconsistencias)
      if (!isClient) {
        updateData.role = formData.role;
        updateData.pin = formData.pin;
        updateData.technical_level = formData.technical_level;
      }

      const { error: dbError } = await supabase
        .from(targetTable)
        .update(updateData)
        .eq('id', user.id);

      if (dbError) throw dbError;

      if (onSave) {
        await onSave('update', { 
          ...user, 
          ...formData,
          full_name: formData.full_name.toUpperCase(),
          type: isClient ? 'client' : 'staff'
        });
      }
      
      onClose();
    } catch (error: any) {
      console.error("Error crítico:", error);
      alert("❌ ERROR AL GUARDAR: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-left">
        
        {/* Header */}
        <div className="bg-[#0a1e3f] px-8 py-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-[#00C897]" size={24} />
            <h2 className="text-xl font-black uppercase tracking-tighter">
              {isClient ? 'Perfil de Cliente' : 'Gestión de Staff'}
            </h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors"><X size={24} /></button>
        </div>

        <div className="p-8 space-y-5">
          {/* Fila: Nombre y Nivel Técnico */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Nombre Completo</label>
              <input 
                disabled={isReadOnly} 
                className={`w-full bg-[#EEF2F6] text-slate-700 font-black text-xs rounded-xl py-4 px-4 outline-none uppercase ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`} 
                value={formData.full_name} 
                onChange={(e) => setFormData({...formData, full_name: e.target.value.toUpperCase()})} 
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">
                {isClient ? 'Tipo de Registro' : 'Cargo / Nivel'}
              </label>
              {isClient ? (
                <div className="w-full bg-slate-100 text-slate-400 font-black text-[10px] rounded-xl py-4 px-4 uppercase">
                  CLIENTE EXTERNO
                </div>
              ) : (
                <select 
                  disabled={isReadOnly} 
                  className={`w-full bg-[#EEF2F6] font-black text-xs rounded-xl py-4 px-4 outline-none uppercase border-r-8 border-transparent ${isReadOnly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`} 
                  value={formData.technical_level} 
                  onChange={(e) => setFormData({...formData, technical_level: e.target.value})} 
                >
                  <option value="lider">LÍDER DE EQUIPO</option>
                  <option value="auxiliar">AUXILIAR TÉCNICO</option>
                </select>
              )}
            </div>
          </div>

          {/* Fila: Rol (Oculto para Clientes) y Teléfono */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Identificador de Acceso</label>
              {isClient ? (
                <div className="w-full bg-blue-50 text-blue-600 font-black text-xs rounded-xl py-4 px-4 uppercase border border-blue-100">
                  PORTAL CLIENTES
                </div>
              ) : (
                <select 
                  disabled={isReadOnly} 
                  className={`w-full font-black text-xs rounded-xl py-4 px-4 outline-none uppercase border-r-8 border-transparent ${isReadOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-[#EEF2F6]'}`} 
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="superadmin">SUPERADMIN</option>
                  <option value="admin">ADMINISTRADOR</option>
                  <option value="coordinador">COORDINADOR</option>
                  <option value="operativo">OPERATIVO</option>
                </select>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Teléfono</label>
              <input 
                disabled={isReadOnly}
                className={`w-full bg-[#EEF2F6] text-slate-700 font-bold text-xs rounded-xl py-4 px-4 outline-none ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`} 
                value={formData.phone} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})} 
              />
            </div>
          </div>

          {/* Email (Siempre bloqueado por integridad de la cuenta) */}
          <div className="space-y-1">
             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Correo Electrónico Principal</label>
             <input 
                disabled 
                className="w-full bg-slate-100 text-slate-500 font-bold text-xs rounded-xl py-4 px-4 outline-none cursor-not-allowed" 
                value={formData.email} 
             />
          </div>

          {/* Fila: Password y PIN */}
          <div className={`grid grid-cols-2 gap-4 p-4 rounded-3xl border transition-all ${isReadOnly ? 'bg-slate-50' : 'bg-emerald-50/50 border-emerald-100'}`}>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest pl-1 text-slate-400">Contraseña</label>
              <div className="relative">
                <input 
                  disabled={isReadOnly}
                  type="text"
                  className={`w-full font-bold text-xs rounded-xl py-4 px-4 outline-none border ${isReadOnly ? 'bg-white text-slate-300 cursor-not-allowed' : 'bg-white border-emerald-50 text-slate-700'}`} 
                  value={isReadOnly ? '********' : formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
                <Lock size={14} className="absolute right-3 top-4 text-slate-300" />
              </div>
            </div>
            <div className="space-y-1">
              <label className={`text-[10px] font-black uppercase tracking-widest pl-1 ${isReadOnly || isClient ? 'text-slate-400' : 'text-[#00C897]'}`}>Pin Kiosco</label>
              <input 
                disabled={isReadOnly || isClient} 
                className={`w-full font-black text-center text-sm rounded-xl py-4 outline-none border ${isReadOnly || isClient ? 'bg-slate-100 opacity-60 cursor-not-allowed' : 'bg-white border-emerald-50'}`} 
                value={isReadOnly || isClient ? '••••' : formData.pin} 
                maxLength={4} 
                onChange={(e) => setFormData({...formData, pin: e.target.value})} 
              />
            </div>
          </div>

          {/* Botón Final */}
          {isSuperAdmin ? (
            <button 
              onClick={handleLocalSave} 
              disabled={isProcessing || externalProcessing} 
              className="w-full bg-[#00C897] hover:bg-[#00C897]/90 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 uppercase text-xs tracking-widest flex items-center justify-center gap-3"
            >
              {isProcessing ? "SINCRONIZANDO DB..." : <><Save size={18}/> GUARDAR CAMBIOS MAESTROS</>}
            </button>
          ) : (
            <div className="text-center space-y-2">
              <div className="bg-slate-100 p-4 rounded-2xl">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vista de Solo Lectura</p>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Solo el SuperAdmin puede modificar este registro</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}