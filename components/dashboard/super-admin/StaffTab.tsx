'use client';

import { useState } from 'react';
import { Search, Filter, Edit, Mail, Phone, Shield } from 'lucide-react';

// ✅ DEFINICIÓN DE ROLES PERMITIDOS Y ETIQUETAS (LABELS)
const allowedRoles = ['superadmin', 'admin', 'coordinador', 'operativo', 'tecnico', 'kiosco'];

const roleLabel: Record<string, string> = {
  superadmin: 'SUPERADMIN',
  admin: 'ADMIN',
  coordinador: 'COORDINADOR',
  operativo: 'OPERATIVO',
  tecnico: 'TECNICO',
  kiosco: 'KIOSCO (DISPOSITIVO)', // Label descriptivo para el nuevo rol
};

export default function StaffTab({ staffList, onEdit, hideSearch = false }: any) {
  const [filterRole, setFilterRole] = useState('todos');
  const [search, setSearch] = useState('');

  // Filtrado dinámico que funciona tanto con el buscador interno como con el global
  const filtered = staffList.filter((u: any) => {
    const matchRole = filterRole === 'todos' || u.role === filterRole;
    const matchSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) || 
                        u.email?.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* SECCIÓN DE BÚSQUEDA Y FILTRO */}
      {!hideSearch && (
        <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              className="w-full bg-slate-50 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-black outline-none uppercase" 
              placeholder="BUSCAR POR NOMBRE O CORREO..." 
              value={search}
              onChange={(e) => setSearch(e.target.value.toUpperCase())}
            />
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 px-4 rounded-2xl border border-slate-100">
            <Filter size={14} className="text-slate-400" />
            <select 
              className="bg-transparent text-[10px] font-black uppercase outline-none py-3 cursor-pointer"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="todos">TODOS LOS ROLES</option>
              {allowedRoles.map((role) => (
                <option key={role} value={role}>
                  {roleLabel[role] || role.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* LISTA DE PERSONAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((member: any) => (
          <div key={member.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-5">
              {/* Avatar con color distintivo si es Kiosco */}
              <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-xl shadow-lg transition-colors ${member.role === 'kiosco' ? 'bg-[#00C897] text-[#0a1e3f]' : 'bg-slate-900 text-white'}`}>
                {member.full_name?.charAt(0).toUpperCase()}
              </div>
              
              <div className="space-y-1">
                <h3 className="font-black text-slate-800 uppercase text-sm tracking-tight leading-none">
                  {member.full_name?.toUpperCase()}
                </h3>
                <div className="flex items-center gap-3">
                  {/* Badge de Rol */}
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter border ${
                    member.role === 'kiosco' 
                    ? 'bg-blue-50 text-blue-600 border-blue-100' 
                    : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  }`}>
                    {roleLabel[member.role] || member.role?.toUpperCase()}
                  </span>
                  
                  <div className="flex items-center gap-2 text-slate-400">
                    <Mail size={12} />
                    <span className="text-[10px] font-bold lowercase">{member.email}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => onEdit(member)}
              className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-95"
            >
              <Edit size={18} />
            </button>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">No se encontraron miembros o dispositivos</p>
          </div>
        )}
      </div>
    </div>
  );
}