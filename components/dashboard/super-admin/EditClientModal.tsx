'use client';

import { useState, useEffect } from 'react';
import { X, Save, User, Building2, Phone, Mail, Lock, UserCog, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';

export default function EditClientModal({ 
  isOpen, 
  onClose, 
  client, 
  onUpdate,
  currentUser,
  staffList = [] 
}: any) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Para ver/ocultar password
  const [newPassword, setNewPassword] = useState(''); // Estado para la nueva contraseña

  const [formData, setFormData] = useState({
    organization: '',
    full_name: '',
    email: '',
    phone: '',
    coordinator_id: '',
  });

  // Solo Superadmin puede editar datos sensibles
  const isSuperAdmin = currentUser?.role === 'superadmin';

  // Filtrar solo coordinadores, admins y superadmins (ellos pueden coordinar)
  const coordinators = staffList.filter((u: any) => 
    ['coordinador', 'admin', 'superadmin'].includes((u.role || '').toLowerCase())
  );

  useEffect(() => {
    if (client) {
      setFormData({
        organization: client.organization || '',
        full_name: client.full_name || '',
        email: client.email || '',
        phone: client.phone || '',
        coordinator_id: client.coordinator_id || '',
      });
      setNewPassword(''); // Limpiar password al abrir
    }
  }, [client]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Actualizar Datos del Perfil (Base de Datos)
      const updates: any = {
        organization: formData.organization,
        full_name: formData.full_name,
        phone: formData.phone,
        coordinator_id: formData.coordinator_id || null, // Aquí se asigna el coordinador
      };

      // Guardar en tabla clients
      const { error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', client.id);

      if (error) throw error;

      // 2. Actualizar Contraseña (Si se escribió alguna) - VÍA API
      if (isSuperAdmin && newPassword.trim() !== '') {
          if (newPassword.length < 6) {
              alert("⚠️ La contraseña debe tener al menos 6 caracteres. Los datos del perfil se guardaron, pero la contraseña no.");
              setLoading(false);
              return;
          }

          // LLAMADA AL BACKEND QUE CREAMOS EN EL PASO 1
          const response = await fetch('/api/admin/update-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  userId: client.id, 
                  newPassword: newPassword 
              })
          });

          const result = await response.json();
          
          if (!response.ok) {
              throw new Error(result.error || 'Error al actualizar contraseña');
          }
      }

      alert('✅ Cliente actualizado correctamente.');
      onUpdate(); // Refrescar tabla
      onClose();

    } catch (error: any) {
      console.error(error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-[#0a1e3f] p-6 flex justify-between items-center text-white">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Gestionar Cliente</h2>
            <p className="text-blue-200 text-xs font-bold uppercase">{client.email}</p>
          </div>
          <button onClick={onClose} className="bg-white/10 p-2 rounded-xl hover:bg-white/20 transition-all"><X size={20}/></button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
          
          {/* SECCIÓN 1: ASIGNACIÓN DE COORDINADOR (CRÍTICO) */}
          <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
            <h3 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <UserCog size={16}/> Asignación de Coordinador
            </h3>
            <p className="text-[10px] text-slate-500 mb-3">
              Selecciona un coordinador para que este cliente pueda empezar a operar.
            </p>
            <div className="relative">
                <select
                    value={formData.coordinator_id}
                    onChange={(e) => setFormData({...formData, coordinator_id: e.target.value})}
                    className="w-full bg-white border-2 border-amber-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-amber-500 uppercase cursor-pointer"
                >
                    <option value="">-- CLIENTE EN ESPERA (SIN ASIGNAR) --</option>
                    {coordinators.map((c: any) => (
                        <option key={c.id} value={c.id}>
                            {c.full_name} ({c.role.toUpperCase()})
                        </option>
                    ))}
                </select>
            </div>
          </div>

          {/* SECCIÓN 2: DATOS DEL CLIENTE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Organización */}
            <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Empresa</label>
                <div className="relative">
                    <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input 
                        type="text" 
                        disabled={!isSuperAdmin} // Solo Superadmin
                        value={formData.organization}
                        onChange={(e) => setFormData({...formData, organization: e.target.value})}
                        className={`w-full border rounded-xl pl-9 pr-3 py-3 text-xs font-bold outline-none uppercase ${isSuperAdmin ? 'bg-slate-50 border-slate-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                    />
                </div>
            </div>

            {/* Nombre Contacto */}
            <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Contacto</label>
                <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input 
                        type="text" 
                        disabled={!isSuperAdmin}
                        value={formData.full_name}
                        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                        className={`w-full border rounded-xl pl-9 pr-3 py-3 text-xs font-bold outline-none uppercase ${isSuperAdmin ? 'bg-slate-50 border-slate-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                    />
                </div>
            </div>

            {/* Teléfono */}
            <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Teléfono</label>
                <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input 
                        type="text" 
                        disabled={!isSuperAdmin}
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className={`w-full border rounded-xl pl-9 pr-3 py-3 text-xs font-bold outline-none ${isSuperAdmin ? 'bg-slate-50 border-slate-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                    />
                </div>
            </div>

            {/* Email (Solo lectura siempre, es ID) */}
            <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Email (ID)</label>
                <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input 
                        type="text" 
                        disabled
                        value={formData.email}
                        className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-xs font-bold text-slate-400 cursor-not-allowed"
                    />
                </div>
            </div>
          </div>

          {/* SECCIÓN 3: SEGURIDAD (Solo SuperAdmin) */}
          {isSuperAdmin && (
             <div className="bg-red-50 p-4 rounded-2xl border border-red-100 mt-4">
                <h4 className="text-[10px] font-black text-red-500 uppercase flex items-center gap-2 mb-2">
                    <ShieldAlert size={12}/> Zona de Peligro (SuperAdmin)
                </h4>
                <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-300"/>
                    <input 
                        type={showPassword ? "text" : "password"}
                        placeholder="Escribir nueva contraseña para cambiarla"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-white border border-red-200 rounded-lg pl-9 pr-10 py-3 text-xs text-red-800 placeholder:text-red-200 outline-none focus:border-red-400 transition-all"
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-red-300 hover:text-red-500"
                    >
                        {showPassword ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                </div>
                <p className="text-[9px] text-red-400 mt-1">* Si dejas este campo vacío, la contraseña NO cambiará.</p>
             </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors">Cancelar</button>
            <button 
                onClick={handleSave} 
                disabled={loading}
                className="bg-[#00C897] hover:bg-[#00a07a] text-[#0a1e3f] px-8 py-3 rounded-xl font-black text-xs uppercase shadow-lg flex items-center gap-2"
            >
                {loading ? <span className="animate-spin">⌛</span> : <Save size={16}/>} Guardar Cambios
            </button>
        </div>
      </div>
    </div>
  );
}