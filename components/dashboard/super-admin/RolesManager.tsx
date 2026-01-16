'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { Shield, Save, Loader2, Check } from 'lucide-react';

const MODULES = [
  { id: 'clients', label: 'Clientes' },
  { id: 'assets', label: 'Activos' },
  { id: 'staff', label: 'Personal' },
  { id: 'tickets', label: 'Servicios' },
];

const ACTIONS = [
  { id: 'read', label: 'Ver' },
  { id: 'create', label: 'Crear' },
  { id: 'edit', label: 'Editar' },
  { id: 'delete', label: 'Eliminar' },
];

export default function RolesManager() {
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('coordinador'); 
  const [permissions, setPermissions] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    // Traemos todos menos superadmin (él siempre tiene todo)
    const { data } = await supabase.from('role_settings').select('*').neq('role', 'superadmin');
    if (data) {
      setRoles(data);
      const current = data.find(r => r.role === selectedRole) || data[0];
      if (current) {
        setSelectedRole(current.role);
        setPermissions(current.permissions || {});
      }
    }
    setLoading(false);
  };

  const handleRoleChange = (roleName: string) => {
    setSelectedRole(roleName);
    const roleData = roles.find(r => r.role === roleName);
    setPermissions(roleData?.permissions || {});
  };

  const togglePermission = (moduleId: string, actionId: string) => {
    setPermissions((prev: any) => {
      const modulePerms = prev[moduleId] || {};
      const newValue = !modulePerms[actionId];
      return {
        ...prev,
        [moduleId]: { ...modulePerms, [actionId]: newValue }
      };
    });
  };

  const saveChanges = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('role_settings')
      .update({ permissions: permissions })
      .eq('role', selectedRole);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      // Actualizamos estado local
      const updatedRoles = roles.map(r => r.role === selectedRole ? {...r, permissions} : r);
      setRoles(updatedRoles);
      alert('✅ Permisos actualizados correctamente');
    }
    setSaving(false);
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin inline"/> Cargando configuración...</div>;

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
            <h2 className="text-xl font-black text-[#0a1e3f] uppercase tracking-tight flex items-center gap-2">
                <Shield className="text-[#00C897]"/> Gestión de Roles (RBAC)
            </h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Configura qué puede hacer el rol: <span className="text-blue-600 font-black">{selectedRole}</span></p>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl overflow-x-auto max-w-full">
            {roles.map(r => (
                <button key={r.role} onClick={() => handleRoleChange(r.role)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedRole === r.role ? 'bg-[#0a1e3f] text-white shadow-md' : 'text-slate-500 hover:bg-white'}`}>
                    {r.role}
                </button>
            ))}
        </div>
      </div>

      {/* MATRIZ DE PERMISOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {MODULES.map((module) => (
            <div key={module.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:border-blue-200 transition-all">
                <h3 className="font-black text-slate-700 uppercase text-xs mb-4 pb-2 border-b border-slate-50">{module.label}</h3>
                <div className="space-y-3">
                    {ACTIONS.map(action => {
                        const isChecked = permissions[module.id]?.[action.id] || false;
                        return (
                            <div key={action.id} className="flex justify-between items-center cursor-pointer group" onClick={() => togglePermission(module.id, action.id)}>
                                <span className={`text-[10px] font-bold uppercase transition-colors ${isChecked ? 'text-slate-700' : 'text-slate-300'}`}>{action.label}</span>
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isChecked ? 'bg-[#00C897] border-[#00C897]' : 'bg-slate-50 border-slate-200'}`}>
                                    {isChecked && <Check size={12} className="text-white font-bold"/>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        ))}
      </div>

      {/* BOTÓN FLOTANTE */}
      <div className="flex justify-end sticky bottom-4 z-20">
        <button onClick={saveChanges} disabled={saving} className="bg-[#0a1e3f] text-white px-8 py-4 rounded-full font-black uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border-4 border-slate-50">
            {saving ? <Loader2 className="animate-spin"/> : <Save size={20}/>} Guardar Cambios
        </button>
      </div>
    </div>
  );
}