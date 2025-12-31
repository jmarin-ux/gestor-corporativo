'use client';

import { useState } from 'react';
import { Plus, Edit, Server, ShieldCheck } from 'lucide-react';

interface Props {
  staffList: any[];
  currentUserRole: string;
  onEdit: (user: any) => void;
  onCreate: (role: string) => void;
}

export default function StaffTab({ staffList = [], currentUserRole, onEdit, onCreate }: Props) {
  const [subTab, setSubTab] = useState('administrativos');

  return (
    <div className="animate-in fade-in">
        {/* BARRA DE FILTROS */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                <button onClick={() => setSubTab('administrativos')} className={`px-5 py-2 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${subTab === 'administrativos' ? 'bg-blue-600 text-white' : 'bg-white text-slate-400'}`}>Administrativos</button>
                <button onClick={() => setSubTab('kioscos')} className={`px-5 py-2 rounded-full text-[10px] font-black uppercase whitespace-nowrap flex items-center gap-2 ${subTab === 'kioscos' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-400'}`}><Server size={12}/> Accesos Kiosco</button>
                <button onClick={() => setSubTab('operativos')} className={`px-5 py-2 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${subTab === 'operativos' ? 'bg-[#0a1e3f] text-white' : 'bg-white text-slate-400'}`}>Operativos</button>
            </div>
            
            {currentUserRole === 'superadmin' && (
                <button onClick={() => onCreate(subTab === 'kioscos' ? 'kiosk_master' : (subTab === 'operativos' ? 'operativo' : 'admin'))} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full shadow-md transition-all text-[10px] font-black uppercase">
                    <Plus size={14} strokeWidth={3} />
                    <span>Nuevo {subTab === 'kioscos' ? 'Kiosco' : (subTab === 'operativos' ? 'Operativo' : 'Admin')}</span>
                </button>
            )}
        </div>

        {/* INFO KIOSCO */}
        {subTab === 'administrativos' && (
            <div className="mb-8 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center gap-3">
                <ShieldCheck className="text-blue-500" size={20}/>
                <p className="text-xs text-blue-800">Gestiona aquí a los directores y coordinadores. Para las llaves de acceso, usa la pestaña <strong>Accesos Kiosco</strong>.</p>
            </div>
        )}

        {/* GRID DE USUARIOS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {staffList
                .filter(p => {
                    if (subTab === 'administrativos') return ['superadmin', 'admin', 'coordinador'].includes(p.role);
                    if (subTab === 'kioscos') return p.role === 'kiosk_master';
                    if (subTab === 'operativos') return p.role === 'operativo';
                    return false;
                })
                .map(p => (
                <div key={p.id} className={`bg-white p-6 rounded-[2rem] border shadow-sm flex items-center gap-4 relative overflow-hidden ${p.role === 'kiosk_master' ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100'}`}>
                    
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black shadow-md ${
                        p.role === 'admin' ? 'bg-indigo-600' : 
                        p.role === 'kiosk_master' ? 'bg-emerald-500' : 
                        'bg-slate-700'
                    }`}>
                        {p.role === 'kiosk_master' ? <Server size={20}/> : p.full_name[0]}
                    </div>
                    
                    <div className="flex-1 overflow-hidden z-10">
                        <h4 className="font-bold text-[#0a1e3f] truncate text-sm">{p.full_name}</h4>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-500">{p.role === 'kiosk_master' ? 'LLAVE DE ACCESO' : p.role}</span>
                            
                            {p.role === 'operativo' && p.linked_kiosk_email && (
                                <span className="text-[9px] text-emerald-600 font-bold truncate max-w-[100px] block bg-emerald-50 px-1 rounded" title={p.linked_kiosk_email}>
                                    🔗 {p.linked_kiosk_email.split('@')[0]}
                                </span>
                            )}
                        </div>
                        {p.role === 'kiosk_master' && <p className="text-[10px] text-emerald-600 mt-1 font-mono bg-emerald-100/50 px-2 py-0.5 rounded w-fit">{p.email}</p>}
                    </div>

                    {currentUserRole === 'superadmin' && (
                        <button onClick={() => onEdit(p)} className="text-slate-300 hover:text-blue-600 z-10 bg-white/50 p-2 rounded-full"><Edit size={16}/></button>
                    )}
                </div>
            ))}
        </div>
    </div>
  );
}