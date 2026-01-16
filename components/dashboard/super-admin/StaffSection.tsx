'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { Search, Users, Shield, Mail, Phone, MoreHorizontal, UserCog, CheckCircle2, XCircle } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
// Asumo que tienes este modal en la misma carpeta, si no ajusta la ruta
import GlobalAdminModal from './GlobalAdminModal'; 

// 👇 EL PARCHE PARA VERCEL: 
// Aceptamos las props viejas (onRefresh, profiles, onUpdate) para que no rompa el build
interface StaffSectionProps {
  currentUser: any;
  profiles?: any[];
  onRefresh?: any;
  onUpdate?: any;
}

export default function StaffSection({ currentUser, ...ignoredProps }: StaffSectionProps) {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal de Edición
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 🔒 PERMISOS
  const { can } = usePermissions(currentUser);
  const canRead = can('staff', 'read');
  const canEdit = can('staff', 'edit');
  // const canCreate = can('staff', 'create'); // Si tuvieras botón de crear

  const fetchData = async () => {
    setLoading(true);
    // Traemos todos los perfiles
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

  const handleEdit = (user: any) => {
    if (!canEdit) return;
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  // Filtrado
  const filteredStaff = staff.filter(user => 
    (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.role || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!loading && !canRead) {
     return <div className="p-10 text-center text-slate-400">No tienes permisos para ver el personal.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* HEADER */}
      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
            <div className="bg-violet-50 p-3 rounded-2xl text-violet-600">
                <Users size={20}/>
            </div>
            <div>
                <h2 className="font-black text-slate-800 uppercase text-sm tracking-wide">Equipo de Trabajo</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{staff.length} Miembros</p>
            </div>
        </div>
        
        <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
            <input 
                type="text" 
                placeholder="Buscar personal..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-3 text-xs font-bold outline-none uppercase focus:border-violet-500 transition-all"
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        {/* Botón Nuevo (Opcional, si tienes lógica de crear usuario) 
        <button className="bg-[#0a1e3f] text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2">
            <UserPlus size={16}/> Nuevo
        </button>
        */}
      </div>

      {/* LISTA DE PERSONAL */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <tr>
                        <th className="p-6">Nombre / Email</th>
                        <th className="p-6 text-center">Rol Asignado</th>
                        <th className="p-6 text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                    {filteredStaff.map(user => (
                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="p-6">
                                <p className="font-black text-[#0a1e3f] uppercase text-sm">{user.full_name || 'Sin Nombre'}</p>
                                <div className="flex items-center gap-1 text-slate-400 mt-1">
                                    <Mail size={12}/> {user.email}
                                </div>
                            </td>
                            <td className="p-6 text-center">
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                    user.role === 'superadmin' ? 'bg-red-100 text-red-600' :
                                    user.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                                    user.role === 'coordinador' ? 'bg-blue-100 text-blue-600' :
                                    'bg-emerald-100 text-emerald-600'
                                }`}>
                                    <Shield size={10}/> {user.role || 'INVITADO'}
                                </span>
                            </td>
                            <td className="p-6 text-center">
                                {canEdit ? (
                                    <button 
                                        onClick={() => handleEdit(user)}
                                        className="bg-slate-100 text-slate-500 p-2 rounded-xl hover:bg-[#0a1e3f] hover:text-white transition-all"
                                        title="Gestionar Rol y Accesos"
                                    >
                                        <UserCog size={16}/>
                                    </button>
                                ) : (
                                    <span className="text-slate-300">-</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
         </div>
      </div>

      {/* MODAL DE EDICIÓN */}
      {isModalOpen && selectedUser && (
          <GlobalAdminModal
            isOpen={true}
            user={selectedUser}
            currentUser={currentUser}
            canEditSensitiveData={currentUser.role === 'superadmin'}
            onClose={() => setIsModalOpen(false)}
            onUpdate={fetchData}
          />
      )}

    </div>
  );
}