'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { User, Lock, ChevronRight, LogOut, LayoutGrid, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function KioskPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Cargar lista de empleados (excluyendo a usuarios desactivados)
  useEffect(() => {
    const fetchStaff = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'active')
        .order('role'); // Ordenar para que salgan directivos primero o al gusto
      
      if (data) setProfiles(data);
    };
    fetchStaff();
  }, []);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // VALIDACIÓN DEL PIN
    // Comparamos el PIN escrito con el PIN real de la base de datos
    if (pin === selectedUser.pin) {
      // ¡Correcto! Entramos
      router.push(`/dashboard?role=${selectedUser.role}`);
    } else {
      setError('PIN Incorrecto');
      setPin('');
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 relative">
      
      {/* Fondo decorativo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]"/>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]"/>
      </div>

      {/* Header Kiosco */}
      <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-4 shadow-2xl">
          <LayoutGrid className="text-cyan-400" size={32} />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tight">Selecciona tu Usuario</h1>
        <p className="text-slate-400 mt-2 text-sm">Modo Kiosco Activo • Ingreso Rápido</p>
      </div>

      {/* GRID DE USUARIOS */}
      {!selectedUser ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-4xl animate-in zoom-in-95 duration-500">
          {profiles.map((user) => (
            <button
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className="group relative bg-slate-900/50 border border-white/10 hover:border-cyan-500/50 p-6 rounded-2xl transition-all hover:-translate-y-1 hover:bg-slate-800 flex flex-col items-center text-center"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 text-xl font-bold
                ${user.role === 'superadmin' ? 'bg-red-500 text-white' : 
                  user.role === 'admin' ? 'bg-blue-600 text-white' : 
                  user.role === 'coordinador' ? 'bg-purple-600 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {user.full_name.charAt(0)}
              </div>
              <h3 className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors">{user.full_name}</h3>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">{user.role}</p>
            </button>
          ))}
        </div>
      ) : (
        /* MODAL DE PIN (Cuando seleccionas un usuario) */
        <div className="w-full max-w-sm bg-slate-900 border border-white/20 p-8 rounded-3xl shadow-2xl animate-in zoom-in-95">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-1">Hola, {selectedUser.full_name.split(' ')[0]}</h3>
            <p className="text-xs text-slate-400">Ingresa tu PIN de seguridad</p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-6">
            <div className="relative">
                <input 
                  type="password" 
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="• • • •"
                  className="w-full bg-black/50 border border-slate-700 text-center text-2xl tracking-[1em] py-4 rounded-xl text-white focus:border-cyan-500 outline-none transition-all placeholder:tracking-normal font-mono"
                  maxLength={4}
                  autoFocus
                />
            </div>

            {error && <p className="text-red-400 text-xs text-center font-bold animate-pulse">{error}</p>}

            <button type="submit" disabled={isLoading} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2">
              {isLoading ? <Loader2 className="animate-spin"/> : <>ACCEDER <ChevronRight/></>}
            </button>
          </form>
          
          <button onClick={() => {setSelectedUser(null); setPin(''); setError('')}} className="w-full mt-4 text-xs text-slate-500 hover:text-white py-2">
            ← Seleccionar otro usuario
          </button>
        </div>
      )}

      {/* Salir del Kiosco */}
      <div className="fixed bottom-6 text-center w-full">
         <Link href="/login" className="inline-flex items-center gap-2 text-[10px] text-slate-600 hover:text-red-400 transition-colors uppercase font-bold tracking-widest">
            <LogOut size={12}/> Cerrar Sesión Maestra
         </Link>
      </div>

    </main>
  );
}