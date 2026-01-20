'use client';

import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { 
  Search, Users, Shield, Mail, Phone, UserCog, 
  UserPlus, Lock, Briefcase, Save, Loader2, Edit, Trash2, X, AlertTriangle,
  User, ChevronDown 
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

export default function StaffSection({ currentUser, ...ignoredProps }: any) {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- MODAL CREAR ---
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '', fullName: '', role: 'operativo', position: '', phone: '' });
  const [creating, setCreating] = useState(false);

  // --- MODAL EDITAR ---
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ full_name: '', role: '', position: '', phone: '' });
  const [newPassword, setNewPassword] = useState(''); 
  const [saving, setSaving] = useState(false);

  // 🔒 PERMISOS
  const { can } = usePermissions(currentUser);
  const canRead = can('staff', 'read');
  const isSuperAdmin = currentUser?.role === 'superadmin'; 

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setStaff(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- HANDLERS ---

  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setEditForm({
        full_name: user.full_name || '',
        role: user.role || 'operativo',
        position: user.position || '', 
        phone: user.phone || ''
    });
    setNewPassword(''); 
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
      if (!editingUser) return;
      
      // Validación: Operativo debe tener puesto
      if (editForm.role === 'operativo' && !editForm.position) {
          return alert("El personal operativo debe tener un puesto asignado (LIDER o AUXILIAR).");
      }

      setSaving(true);
      try {
          const { error } = await supabase.from('profiles').update({
              full_name: editForm.full_name.toUpperCase(),
              role: editForm.role,
              position: editForm.position.toUpperCase(),
              phone: editForm.phone,
              updated_at: new Date().toISOString()
          }).eq('id', editingUser.id);

          if (error) throw error;

          if (isSuperAdmin && newPassword.trim() !== '') {
              const response = await fetch('/api/admin/update-password', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: editingUser.id, newPassword: newPassword })
              });
              
              if (!response.ok) {
                  const errData = await response.json();
                  alert("⚠️ Datos guardados, pero falló el cambio de contraseña: " + (errData.error || 'Error desconocido'));
              } else {
                  alert("✅ Usuario y contraseña actualizados correctamente.");
              }
          } else {
              alert("✅ Datos actualizados correctamente.");
          }

          setIsEditOpen(false);
          fetchData();

      } catch (e: any) {
          alert("Error: " + e.message);
      } finally {
          setSaving(false);
      }
  };

  const handleDelete = async (userId: string) => {
      if (!confirm("¿Seguro que deseas eliminar este usuario?")) return;
      try {
          const { error } = await supabase.from('profiles').delete().eq('id', userId);
          if (error) throw error;
          alert("Usuario eliminado.");
          fetchData();
      } catch (e: any) {
          alert("Error: " + e.message);
      }
  };

  const handleCreate = async () => {
    if (!createForm.email || !createForm.password || !createForm.fullName || !createForm.position) {
        return alert("Faltan datos obligatorios (*). Selecciona un Puesto.");
    }
    
    setCreating(true);
    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: createForm.email,
            password: createForm.password,
            options: { data: { full_name: createForm.fullName.toUpperCase(), role: createForm.role } }
        });
        if (authError) throw authError;
        
        if (authData.user) {
            await supabase.from('profiles').upsert({
                id: authData.user.id,
                email: createForm.email,
                full_name: createForm.fullName.toUpperCase(),
                role: createForm.role,
                position: createForm.position.toUpperCase(),
                phone: createForm.phone,
                is_active: true,
                created_at: new Date().toISOString()
            });
        }
        alert("✅ Creado exitosamente");
        setIsCreateOpen(false);
        setCreateForm({ email: '', password: '', fullName: '', role: 'operativo', position: '', phone: '' });
        fetchData();
    } catch (e: any) { alert("Error: " + e.message); } finally { setCreating(false); }
  };

  const getRoleBadge = (role: string) => {
      const r = (role || '').toLowerCase();
      if (r === 'superadmin') return <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 w-fit"><Shield size={10}/> SUPER ADMIN</span>;
      if (r === 'admin') return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 w-fit"><Shield size={10}/> ADMIN</span>;
      if (r === 'coordinador') return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 w-fit"><User size={10}/> COORDINADOR</span>;
      return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 w-fit"><User size={10}/> OPERATIVO</span>;
  };

  const filteredStaff = staff.filter(user => 
    (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!loading && !canRead) return <div className="p-10 text-center text-slate-400">Acceso denegado.</div>;

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input className="w-full bg-slate-50 border border-slate-200 rounded-full pl-12 pr-4 py-3 text-xs font-bold outline-none uppercase"
                placeholder="BUSCAR PERSONAL..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {isSuperAdmin && (
            <button onClick={() => setIsCreateOpen(true)} className="bg-[#0a1e3f] text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 whitespace-nowrap shadow-lg active:scale-95">
                <UserPlus size={16}/> Nuevo Integrante
            </button>
        )}
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <tr><th className="p-6">Nombre / Email</th><th className="p-6 text-center">Rol</th><th className="p-6 text-center">Puesto</th><th className="p-6 text-center">Acciones</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                    {filteredStaff.map(user => (
                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-6">
                                <p className="font-black text-[#0a1e3f] uppercase text-sm">{user.full_name}</p>
                                <div className="flex items-center gap-1 text-slate-400 mt-1"><Mail size={12}/> {user.email}</div>
                            </td>
                            <td className="p-6 text-center">{getRoleBadge(user.role)}</td>
                            <td className="p-6 text-center">
                                <span className={`font-black uppercase text-[9px] px-2 py-1 rounded-lg ${
                                    user.position === 'LIDER' 
                                    ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                                    : user.position === 'AUXILIAR' 
                                        ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                        : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {user.position || 'N/A'}
                                </span>
                            </td>
                            <td className="p-6 text-center">
                                <div className="flex justify-center gap-2">
                                    <button onClick={() => handleOpenEdit(user)} className="bg-slate-100 text-slate-500 p-2 rounded-xl hover:bg-[#0a1e3f] hover:text-white transition-all"><Edit size={16}/></button>
                                    {isSuperAdmin && <button onClick={() => handleDelete(user.id)} className="bg-rose-50 text-rose-500 p-2 rounded-xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={16}/></button>}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
         </div>
      </div>

      {/* --- MODAL CREAR --- */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                <div className="bg-[#0a1e3f] p-6 flex justify-between items-center text-white">
                    <h2 className="text-xl font-black uppercase tracking-tight">Alta de Personal</h2>
                    <button onClick={() => setIsCreateOpen(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"><X size={20}/></button>
                </div>
                <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2 block">Email *</label><input className="w-full bg-slate-50 border rounded-xl py-2 px-3 text-xs font-bold" value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})}/></div>
                        <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2 block">Pass *</label><input className="w-full bg-slate-50 border rounded-xl py-2 px-3 text-xs font-bold" type="password" value={createForm.password} onChange={e => setCreateForm({...createForm, password: e.target.value})}/></div>
                    </div>
                    <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2 block">Nombre *</label><input className="w-full bg-slate-50 border rounded-xl py-2 px-3 text-xs font-bold uppercase" value={createForm.fullName} onChange={e => setCreateForm({...createForm, fullName: e.target.value})}/></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2 block">Rol</label><select className="w-full bg-indigo-50 border border-indigo-100 rounded-xl py-2 px-3 text-xs font-bold" value={createForm.role} onChange={e => setCreateForm({...createForm, role: e.target.value})}><option value="operativo">Operativo</option><option value="coordinador">Coordinador</option><option value="admin">Admin</option><option value="superadmin">Super Admin</option></select></div>
                        
                        {/* SELECTOR DE PUESTO (CREAR) */}
                        <div className="relative">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 block">Puesto *</label>
                            <select 
                                className="w-full bg-emerald-50 border border-emerald-100 rounded-xl py-2 px-3 text-xs font-bold uppercase appearance-none cursor-pointer" 
                                value={createForm.position} 
                                onChange={e => setCreateForm({...createForm, position: e.target.value})}
                            >
                                <option value="">-- SELECCIONAR --</option>
                                <option value="LIDER">LIDER</option>
                                <option value="AUXILIAR">AUXILIAR</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-[2.1rem] text-emerald-600 pointer-events-none"/>
                        </div>
                    </div>
                    <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2 block">Teléfono</label><input className="w-full bg-slate-50 border rounded-xl py-2 px-3 text-xs font-bold" value={createForm.phone} onChange={e => setCreateForm({...createForm, phone: e.target.value})}/></div>
                </div>
                <div className="p-6 bg-slate-50 border-t flex justify-end"><button onClick={handleCreate} disabled={creating} className="bg-[#0a1e3f] text-white px-8 py-3 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-slate-800">{creating ? <Loader2 className="animate-spin"/> : 'Crear Usuario'}</button></div>
            </div>
        </div>
      )}

      {/* --- MODAL EDITAR --- */}
      {isEditOpen && editingUser && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                <div className="bg-[#0a1e3f] p-6 flex justify-between items-center text-white">
                    <div><h2 className="text-xl font-black uppercase tracking-tight">Editar Personal</h2><p className="text-[10px] text-blue-200">ID: {editingUser.id.slice(0,8)}</p></div>
                    <button onClick={() => setIsEditOpen(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full"><X size={20}/></button>
                </div>
                <div className="p-8 space-y-6">
                    <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2 block">Nombre</label><input className="w-full bg-slate-50 border rounded-xl py-3 px-4 text-xs font-bold uppercase" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})}/></div>
                    <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2 block">Email (Solo Lectura)</label><input disabled className="w-full bg-slate-100 border rounded-xl py-3 px-4 text-xs font-bold text-slate-500" value={editingUser.email}/></div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2 block">Rol</label><select className="w-full bg-indigo-50 border border-indigo-100 rounded-xl py-3 px-4 text-xs font-bold uppercase" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}><option value="operativo">Operativo</option><option value="coordinador">Coordinador</option><option value="admin">Admin</option><option value="superadmin">Super Admin</option></select></div>
                        
                        {/* SELECTOR DE PUESTO (EDITAR) */}
                        <div className="relative">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 block">Puesto</label>
                            <select 
                                className="w-full bg-emerald-50 border border-emerald-100 rounded-xl py-3 px-4 text-xs font-bold uppercase appearance-none cursor-pointer" 
                                value={editForm.position} 
                                onChange={e => setEditForm({...editForm, position: e.target.value})}
                            >
                                <option value="LIDER">LIDER</option>
                                <option value="AUXILIAR">AUXILIAR</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-[2.2rem] text-emerald-600 pointer-events-none"/>
                        </div>
                    </div>

                    {isSuperAdmin && (
                        <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 mt-2">
                            <label className="text-[10px] font-black text-rose-600 uppercase ml-2 block flex items-center gap-1">
                                <Lock size={12}/> Cambiar Contraseña (Opcional)
                            </label>
                            <input 
                                type="password"
                                className="w-full bg-white border border-rose-200 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-rose-500 mt-1 placeholder:text-rose-200"
                                placeholder="Escribe nueva contraseña..."
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                            />
                            <p className="text-[9px] text-rose-400 mt-1 font-medium ml-2">Deja este campo vacío para mantener la actual.</p>
                        </div>
                    )}
                </div>
                <div className="p-6 bg-slate-50 border-t flex justify-end gap-3">
                    <button onClick={() => setIsEditOpen(false)} className="px-6 py-3 rounded-xl text-xs font-black text-slate-400 hover:bg-slate-200 uppercase">Cancelar</button>
                    <button onClick={handleSaveEdit} disabled={saving} className="bg-[#0a1e3f] text-white px-8 py-3 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-slate-800">{saving ? <Loader2 className="animate-spin"/> : 'Guardar Cambios'}</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}