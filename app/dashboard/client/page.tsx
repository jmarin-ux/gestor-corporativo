'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase'
import Link from 'next/link';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { 
  Mail, Lock, Loader2, Eye, EyeOff, User, 
  Phone, Briefcase, Building2, ChevronLeft, Sparkles 
} from 'lucide-react';

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ['latin'], 
  weight: ['400', '500', '600', '700', '800'] 
});

export default function ClientePortal() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({ 
    full_name: '', organization: '', phone: '', position: '', email: '', password: '' 
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        // LOGIN
        const { data: user, error: dbError } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', formData.email)
          .eq('password', formData.password)
          .single();
        
        if (dbError || !user) throw new Error('Credenciales incorrectas.');
        
        // GUARDAR SESIÓN (CLAVE CORRECTA PARA CLIENTE)
        localStorage.setItem('client_user', JSON.stringify(user));
        
        router.push('/dashboard');
      } else {
        // REGISTRO
        const { data: exists } = await supabase
          .from('profiles')
          .select('email')
          .eq('email', formData.email)
          .maybeSingle();
        
        if (exists) throw new Error('Este correo ya está registrado.');
        
        const { error: regError } = await supabase
          .from('profiles')
          .insert([{ ...formData, role: 'cliente', status: 'active' }]);
        
        if (regError) throw new Error(regError.message);
        
        setIsLogin(true);
        setError('¡Registro exitoso! Ya puedes ingresar.');
      }
    } catch (err: any) { 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  // Clases CSS extraídas para evitar errores de saltos de línea
  const inputContainerClass = "relative";
  const inputIconClass = "absolute left-5 top-1/2 -translate-y-1/2 text-[#00C897]";
  const inputFieldClass = "w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-14 pr-4 text-sm font-bold text-slate-700 outline-none focus:border-[#00C897] focus:ring-4 focus:ring-[#00C897]/5 transition-all placeholder:text-slate-400";
  const buttonClass = "w-full bg-[#00C897] hover:bg-[#00b386] text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-[#00C897]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2";

  return (
    <main className={`${jakarta.className} min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4 relative overflow-hidden`}>
      
      {/* Fondo Dinámico */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#00C897]/5 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-xl relative z-10 flex flex-col items-center">
        
        {/* Header Logo */}
        <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
           <div className="bg-white/80 backdrop-blur-md px-6 py-2 rounded-full shadow-sm border border-white/50 flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-[#00C897] animate-pulse"/>
              <span className="text-[10px] font-black tracking-[0.3em] text-slate-700 uppercase">
                WUOTTO <span className="font-light text-slate-400">SERVICES</span>
              </span>
           </div>
        </div>

        {/* Tarjeta Principal */}
        <div className="w-full bg-white/90 backdrop-blur-xl p-8 md:p-12 rounded-[3rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-white animate-in zoom-in-95 duration-500">
          
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-2 tracking-tight">
              {isLogin ? 'Bienvenido' : 'Crear Cuenta'}
            </h1>
            <p className="text-slate-400 font-medium text-sm">
              {isLogin ? 'Ingresa tus credenciales para continuar' : 'Únete al portal de gestión inteligente'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            
            {!isLogin && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={inputContainerClass}>
                  <User className={inputIconClass} size={20} strokeWidth={2.5}/>
                  <input 
                    type="text" 
                    placeholder="Nombre" 
                    className={inputFieldClass}
                    value={formData.full_name} 
                    onChange={e=>setFormData({...formData, full_name:e.target.value})} 
                    required
                  />
                </div>
                <div className={inputContainerClass}>
                  <Building2 className={inputIconClass} size={20} strokeWidth={2.5}/>
                  <input 
                    type="text" 
                    placeholder="Empresa" 
                    className={inputFieldClass}
                    value={formData.organization} 
                    onChange={e=>setFormData({...formData, organization:e.target.value})} 
                    required
                  />
                </div>
                <div className={inputContainerClass}>
                  <Phone className={inputIconClass} size={20} strokeWidth={2.5}/>
                  <input 
                    type="tel" 
                    placeholder="Teléfono" 
                    className={inputFieldClass}
                    value={formData.phone} 
                    onChange={e=>setFormData({...formData, phone:e.target.value})} 
                    required
                  />
                </div>
                <div className={inputContainerClass}>
                  <Briefcase className={inputIconClass} size={20} strokeWidth={2.5}/>
                  <input 
                    type="text" 
                    placeholder="Puesto" 
                    className={inputFieldClass}
                    value={formData.position} 
                    onChange={e=>setFormData({...formData, position:e.target.value})} 
                    required
                  />
                </div>
              </div>
            )}
            
            <div className={inputContainerClass}>
              <Mail className={inputIconClass} size={20} strokeWidth={2.5}/>
              <input 
                type="email" 
                placeholder="Correo Electrónico" 
                className={inputFieldClass}
                value={formData.email} 
                onChange={e=>setFormData({...formData, email:e.target.value})} 
                required
              />
            </div>
            
            <div className={inputContainerClass}>
              <Lock className={inputIconClass} size={20} strokeWidth={2.5}/>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Contraseña" 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-14 pr-14 text-sm font-bold text-slate-700 outline-none focus:border-[#00C897] focus:ring-4 focus:ring-[#00C897]/5 transition-all placeholder:text-slate-400 tracking-wide"
                value={formData.password} 
                onChange={e=>setFormData({...formData, password:e.target.value})} 
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#00C897] transition-colors p-1"
              >
                {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
              </button>
            </div>

            {error && (
              <div className={`p-4 rounded-xl text-xs font-bold text-center border ${error.includes('exitoso') ? 'bg-emerald-50 border-emerald-100 text-[#00C897]' : 'bg-red-50 border-red-100 text-red-500'}`}>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading} 
              className={buttonClass}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  {isLogin ? 'ACCEDER' : 'REGISTRARME'}
                  <Sparkles size={18} className="text-emerald-100" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={()=>{setIsLogin(!isLogin);setError(''); setFormData({ full_name: '', organization: '', phone: '', position: '', email: '', password: '' })}} 
              className="text-slate-500 hover:text-[#00C897] font-bold text-xs uppercase tracking-wider transition-colors"
            >
              {isLogin ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Ingresa aquí'}
            </button>
          </div>
        </div>

        <Link href="/" className="mt-10 flex items-center gap-2 text-slate-400 hover:text-[#00C897] transition-colors text-[10px] font-black uppercase tracking-[0.2em]">
          <ChevronLeft size={14}/> Volver al Hub
        </Link>
      </div>
    </main>
  );
}