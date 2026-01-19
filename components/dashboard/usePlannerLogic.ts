import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const cleanText = (text: string) => {
    return (text || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

export const usePlannerLogic = (currentUser: any) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Datos
  const [sites, setSites] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [leadersList, setLeadersList] = useState<any[]>([]);
  const [auxiliariesList, setAuxiliariesList] = useState<any[]>([]);
  const [pendingTickets, setPendingTickets] = useState<any[]>([]); 
  const [allStaff, setAllStaff] = useState<any[]>([]); // 🟢 Nuevo: Guardamos todo el staff para el modal
  
  // UI
  const [selectedDate, setSelectedDate] = useState(new Date()); 
  const [selectedLeader, setSelectedLeader] = useState<string>(''); 
  const [selectedAux, setSelectedAux] = useState<string>('');
  const [kanbanBoard, setKanbanBoard] = useState<Record<string, any[]>>({});
  
  // 🟢 Modal de Detalle Completo
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTicketForDetail, setSelectedTicketForDetail] = useState<any>(null);

  // Permisos
  const role = (currentUser?.role || '').toLowerCase().trim();
  const canEdit = ['admin', 'superadmin', 'coordinador'].includes(role);
  const isCoordinator = role === 'coordinador';
  const isOperative = ['operativo', 'staff', 'technician'].includes(role);

  // Fechas
  const currentMonday = new Date(selectedDate);
  const day = currentMonday.getDay(); 
  const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1); 
  currentMonday.setDate(diff); 
  const currentSunday = new Date(currentMonday);
  currentSunday.setDate(currentMonday.getDate() + 6); 
  const weekNumber = Math.ceil((((currentMonday.getTime() - new Date(currentMonday.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7);
  
  const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentMonday);
      d.setDate(currentMonday.getDate() + i);
      return { 
          name: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][i],
          date: d,
          dateStr: d.toISOString().split('T')[0],
          isToday: new Date().toISOString().split('T')[0] === d.toISOString().split('T')[0]
      };
  });

  // --- CARGA DE DATOS ---
  const loadData = async () => {
    setLoading(true);
    try {
      const [allClientsRes, sitesRes, profilesRes] = await Promise.all([
        supabase.from('clients').select('*').order('organization'),
        supabase.from('sites').select('*').eq('active', true).order('name'),
        supabase.from('profiles').select('*').order('full_name'), // 🟢 Traemos a todos
      ]);

      setClients(allClientsRes.data || []);
      if (sitesRes.data) setSites(sitesRes.data);
      if (profilesRes.data) {
          setAllStaff(profilesRes.data); // Guardamos lista completa
          
          // Filtros para dropdowns
          const operatives = profilesRes.data.filter(u => u.role === 'operativo');
          const leaders = operatives.filter(u => cleanText(u.position + ' ' + u.technical_level).includes('lider'));
          const auxs = operatives.filter(u => !cleanText(u.position + ' ' + u.technical_level).includes('lider'));

          setLeadersList(leaders);
          setAuxiliariesList(auxs);

          if (!selectedLeader && isOperative) {
              const mySelf = leaders.find(u => u.id === currentUser.id);
              if (mySelf) setSelectedLeader(mySelf.id);
          }
      }

      let ticketsQuery = supabase.from('tickets')
        .select('*')
        .neq('status', 'closed')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (isCoordinator) {
        ticketsQuery = ticketsQuery.or(`coordinator_id.eq.${currentUser.id},coordinador_id.eq.${currentUser.id}`);
      }

      const { data: ticketsData } = await ticketsQuery;
      
      // Inyectar datos de cliente manualmente para evitar errores de join
      const enrichedTickets = (ticketsData || []).map((t: any) => {
          const client = (allClientsRes.data || []).find(c => c.email === t.client_email || c.organization === t.company);
          return { ...t, client };
      });

      const onlyPendings = enrichedTickets.filter((t: any) => !t.scheduled_date);
      setPendingTickets(onlyPendings);

    } catch (e) { console.error("Error data:", e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [currentUser]);

  // --- KANBAN ---
  useEffect(() => {
    const fetchAssignments = async () => {
        const start = currentMonday.toISOString().split('T')[0];
        const endStr = currentSunday.toISOString().split('T')[0];
        
        let query = supabase.from('tickets')
            .select('*') 
            .gte('scheduled_date', start)
            .lte('scheduled_date', endStr)
            .neq('status', 'closed');

        if (isCoordinator) query = query.or(`coordinator_id.eq.${currentUser.id},coordinador_id.eq.${currentUser.id}`);
        if (selectedLeader) query = query.or(`technical_lead_id.eq.${selectedLeader},leader_id.eq.${selectedLeader}`);

        const { data } = await query;
        const newBoard: Record<string, any[]> = {};
        weekDays.forEach(d => newBoard[d.dateStr] = []);
        
        if (data) {
            data.forEach((t: any) => {
                const workDate = t.scheduled_date.split('T')[0];
                let leaderName = '';
                if (!selectedLeader) {
                    const lead = leadersList.find(l => l.id === t.technical_lead_id || l.id === t.leader_id);
                    if (lead) leaderName = lead.full_name.split(' ')[0];
                }
                // Buscar Cliente
                const clientMatch = clients.find(c => c.email === t.client_email || c.organization === t.company);
                const clientName = clientMatch ? clientMatch.organization : (t.company || 'CLIENTE');

                if (newBoard[workDate]) {
                  newBoard[workDate].push({ 
                      ...t, 
                      ticket_id: t.id,
                      leader_name: leaderName,
                      client_name: clientName,
                      site_data: { name: t.title || t.service_type }, 
                      temp_id: Math.random().toString(36),
                      client: clientMatch // Pasamos el objeto cliente completo
                  });
                }
            });
        }
        setKanbanBoard(newBoard);
    };
    if(clients.length > 0 || !loading) fetchAssignments();
  }, [selectedLeader, selectedDate, clients, leadersList, loading]);

  // --- ACTIONS ---
  
  // 🟢 ABRIR DETALLE (Al hacer click en la tarjeta)
  const openTicketDetail = (ticket: any) => {
      setSelectedTicketForDetail(ticket);
      setDetailModalOpen(true);
  };

  // 🟢 CERRAR DETALLE Y RECARGAR
  const closeDetailModal = (shouldReload = false) => {
      setDetailModalOpen(false);
      setSelectedTicketForDetail(null);
      if(shouldReload) loadData(); // Recargamos todo si hubo cambios
  };

  const handleSaveAll = () => { alert("✅ Cambios guardados."); };

  const removeCard = async (dateStr: string, tempId: string, ticketId?: string) => {
    if (!canEdit) return;
    const currentCards = kanbanBoard[dateStr] || [];
    setKanbanBoard({ ...kanbanBoard, [dateStr]: currentCards.filter(c => c.temp_id !== tempId) });
    if (ticketId) {
        await supabase.from('tickets').update({ status: 'open', scheduled_date: null, technical_lead_id: null, leader_id: null, auxiliary_id: null }).eq('id', ticketId);
        loadData();
    }
  };

  const changeWeek = (days: number) => {
      const newDate = new Date(selectedDate);
      newDate.setDate(selectedDate.getDate() + days);
      setSelectedDate(newDate);
  };

  return {
    loading, saving, sites, clients, leadersList, auxiliariesList, pendingTickets, allStaff, // Exportamos allStaff
    selectedDate, selectedLeader, selectedAux, kanbanBoard, 
    detailModalOpen, selectedTicketForDetail, // Estados del modal nuevo
    weekNumber, weekDays, currentMonday, currentSunday,
    canEdit, isOperative,
    setSelectedLeader, setSelectedAux, 
    openTicketDetail, closeDetailModal, // Acciones del modal
    handleSaveAll, removeCard, loadData, changeWeek
  };
};