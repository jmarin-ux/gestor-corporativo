'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { Search, Users, UserPlus, Trash2, Shield, User } from 'lucide-react';
// import EditUserModal from './EditUserModal'; // (Si lo tienes, úsalo con la misma lógica de bloqueo)

export default function StaffSection({ currentUser }: { currentUser: any }) {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 🔒 PERMISOS: Solo Admin y Superadmin pueden gestionar staff
  const canManageStaff = ['admin', 'superadmin'].includes(currentUser?.role);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setStaff(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Función dummy de borrado (solo admins)
  const handleDelete = async (id: string) => {
      if(!canManageStaff) return;
      if(!confirm("¿Seguro que deseas eliminar este usuario?")) return;
      // Aquí iría tu lógica de borrado (normalmente call a API Route)
      alert("Función restringida: Contacta al SuperAdmin para borrar usuarios definitivamente.");
  };

  const filteredStaff = staff.filter(s => 
    (s.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Barra Herramientas */}
      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
            <div className="bg-purple-50 p-3 rounded-2xl text-purple-600"><Users size={20}/></div>
            <div>
                <h2 className="font-black text-slate-800 uppercase text-sm tracking-wide">Equipo de Trabajo</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{staff.length} Miembros</p>
            </div>
        </div>

        <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
            <input type="text" placeholder="Buscar personal..." className="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-3 text-xs font-bold outline-none uppercase" onChange={(e) => setSearchTerm(e.target.value)}/>
        </div>

        {/* 🔒 BOTÓN "NUEVO" SOLO PARA ADMINS */}
        {canManageStaff && (
            <button className="bg-[#0a1e3f] text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2">
                <UserPlus size={14}/> Nuevo
            </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <tr>
                        <th className="p-6">Nombre / Email</th>
                        <th className="p-6">Rol</th>
                        <th className="p-6 text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                    {filteredStaff.map(member => (
                        <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-6">
                                <p className="font-black text-[#0a1e3f] uppercase text-sm">{member.full_name}</p>
                                <p className="text-slate-400">{member.email}</p>
                            </td>
                            <td className="p-6">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 w-fit
                                    ${member.role === 'superadmin' ? 'bg-red-100 text-red-700' : 
                                      member.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                      member.role === 'coordinador' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {member.role === 'superadmin' ? <Shield size={10}/> : <User size={10}/>}
                                    {member.role}
                                </span>
                            </td>
                            <td className="p-6 text-center">
                                {/* 🔒 ACCIONES BLOQUEADAS PARA COORDINADOR */}
                                {canManageStaff ? (
                                    <button onClick={() => handleDelete(member.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                        <Trash2 size={16}/>
                                    </button>
                                ) : (
                                    <span className="text-slate-200 text-[9px]">-</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}