'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { Search, Building2, Mail, Edit3, UserCheck, AlertCircle, Eye } from 'lucide-react';
import EditClientModal from './EditClientModal';
// Asegúrate de haber movido la carpeta 'hooks' a la raíz del proyecto para que esto funcione:
import { usePermissions } from '@/hooks/usePermissions'; 

export default function ClientsSection({ currentUser }: { currentUser: any }) {
  const [clients, setClients] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado del Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  // 🔒 SISTEMA DE PERMISOS DINÁMICO
  const { can } = usePermissions(currentUser);
  // Preguntamos a la base de datos si este rol puede editar clientes
  const canEditClients = can('clients', 'edit'); 

  const fetchData = async () => {
    setLoading(true);
    
    // 1. Cargar Clientes
    const { data: clientsData } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    
    // 2. Cargar Staff (Para obtener coordinadores en el modal)
    const { data: staffData } = await supabase
      .from('profiles')
      .select('id, full_name, role');

    setClients(clientsData || []);
    setStaffList(staffData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (client: any) => {
      // Doble seguridad: Si no tiene permiso según el hook, no abre.
      if (!canEditClients) return; 
      setSelectedClient(client);
      setIsModalOpen(true);
  };

  const filteredClients = clients.filter(c => 
    (c.organization || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* BARRA SUPERIOR */}
      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
                <Building2 size={20}/>
            </div>
            <div>
                <h2 className="font-black text-slate-800 uppercase text-sm tracking-wide">Cartera de Clientes</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{clients.length} Registrados</p>
            </div>
        </div>
        
        <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
            <input 
                type="text" 
                placeholder="Buscar cliente..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-3 text-xs font-bold outline-none uppercase focus:border-blue-500 transition-all"
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        
        <button onClick={fetchData} className="bg-[#0a1e3f] text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
            Refrescar
        </button>
      </div>

      {/* TABLA DE CLIENTES */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <tr>
                        <th className="p-6">Organización / Email</th>
                        <th className="p-6">Contacto Directo</th>
                        <th className="p-6 text-center">Estatus</th>
                        <th className="p-6 text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                    {filteredClients.map(client => {
                        const hasCoordinator = !!client.coordinator_id;
                        
                        return (
                            <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="p-6">
                                    <p className="font-black text-[#0a1e3f] uppercase text-sm">{client.organization}</p>
                                    <div className="flex items-center gap-1 text-slate-400 mt-1">
                                        <Mail size={12}/> {client.email}
                                    </div>
                                </td>
                                <td className="p-6 font-bold text-slate-600 uppercase">
                                    {client.full_name || 'Sin nombre'}
                                    <p className="text-[10px] text-slate-400 font-normal">{client.phone || 'Sin teléfono'}</p>
                                </td>
                                <td className="p-6 text-center">
                                    {hasCoordinator ? (
                                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                                            <UserCheck size={10}/> Activo
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse">
                                            <AlertCircle size={10}/> Pendiente
                                        </span>
                                    )}
                                </td>
                                <td className="p-6 text-center">
                                    {/* 🔒 RENDERIZADO CONDICIONAL BASADO EN LA BD */}
                                    {canEditClients ? (
                                        <button 
                                            onClick={() => handleEdit(client)}
                                            className="bg-slate-100 text-slate-500 p-2.5 rounded-xl hover:bg-[#0a1e3f] hover:text-white transition-all shadow-sm"
                                            title="Gestionar Cliente"
                                        >
                                            <Edit3 size={16}/>
                                        </button>
                                    ) : (
                                        <span className="text-slate-300 text-[9px] font-bold uppercase flex items-center justify-center gap-1 cursor-not-allowed">
                                            <Eye size={14}/> Solo Lectura
                                        </span>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
      </div>

      {/* MODAL DE EDICIÓN (Solo se abre si tiene permiso) */}
      {isModalOpen && selectedClient && canEditClients && (
          <EditClientModal
              isOpen={true}
              client={selectedClient}
              onClose={() => setIsModalOpen(false)}
              onUpdate={fetchData}
              currentUser={currentUser}
              staffList={staffList}
          />
      )}
    </div>
  );
}