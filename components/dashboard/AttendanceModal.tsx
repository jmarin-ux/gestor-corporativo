'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Camera, MapPin, CheckCircle2, 
  Loader2, LogIn, LogOut, ShieldCheck 
} from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';

type Step = 'loading' | 'idle' | 'working' | 'camera' | 'uploading' | 'success' | 'completed' | 'error';
type Mode = 'ENTRADA' | 'SALIDA';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onSuccess?: () => void;
}

export default function AttendanceModal({ isOpen, onClose, currentUser, onSuccess }: AttendanceModalProps) {
  const [step, setStep] = useState<Step>('loading');
  const [mode, setMode] = useState<Mode>('ENTRADA');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 🟢 LÓGICA ULTRA-SEGURA: ¿QUÉ FALTA?
  const checkTodayStatus = useCallback(async () => {
    if (!currentUser) return;
    setStep('loading');

    try {
      const now = new Date();
      // Definimos HOY (Local Time del dispositivo)
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

      // Buscamos TODOS los registros de hoy
      const { data: logs, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', currentUser.id)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      if (error) throw error;

      // 1. ¿Existe alguna ENTRADA hoy?
      const hasEntry = logs?.some(l => l.check_type === 'ENTRADA');

      // 2. ¿Existe alguna SALIDA VÁLIDA hoy? (Manual o Normal)
      // IGNORAMOS 'SALIDA_AUTO' para que si el sistema cerró mal, el usuario pueda corregir saliendo de verdad.
      const hasValidExit = logs?.some(l => 
          l.check_type === 'SALIDA' || 
          l.check_type === 'SALIDA_MANUAL'
      );

      // --- ÁRBOL DE DECISIÓN SIMPLE ---
      
      if (!hasEntry) {
        // No hay entrada -> Toca ENTRADA
        setMode('ENTRADA');
        setStep('idle');
      } 
      else if (hasEntry && !hasValidExit) {
        // Hay entrada y FALTA salida válida -> Toca SALIDA
        // (Esto cubre el caso de que hayas borrado la salida: hasValidExit será false)
        setMode('SALIDA');
        setStep('working');
      } 
      else {
        // Tiene entrada y salida válida -> Terminó
        setStep('completed');
      }

    } catch (err: any) {
      console.error("Error checking status:", err);
      setErrorMsg("Error de conexión. Intenta de nuevo.");
      setStep('error');
    }
  }, [currentUser]);

  useEffect(() => {
    if (isOpen) {
      checkTodayStatus();
      getLocation(); 
    } else {
      setPhoto(null);
      setErrorMsg('');
      setStep('loading');
    }
  }, [isOpen, checkTodayStatus]);

  // GEOLOCALIZACIÓN
  const getLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Navegador sin GPS.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.warn("GPS Pendiente...", err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // CÁMARA
  const startCamera = async () => {
    if (!location) getLocation();
    setStep('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setErrorMsg("Permiso de cámara denegado.");
      setStep('error');
    }
  };

  // CAPTURA Y ENVÍO
  const captureAndSubmit = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext('2d');
    if (context) {
      context.drawImage(videoRef.current, 0, 0, 640, 480);
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.6);
      setPhoto(dataUrl);
      
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
      
      setStep('uploading');

      try {
        const publicUrl = 'https://via.placeholder.com/150?text=EVIDENCIA'; 

        const { error } = await supabase.from('attendance_logs').insert({
          user_id: currentUser.id,
          check_type: mode, 
          created_at: new Date().toISOString(),
          latitude: location?.lat || 0,
          longitude: location?.lng || 0,
          photo_url: publicUrl,
          notes: 'Registro App Web'
        });

        if (error) throw error;

        setStep('success');
        setTimeout(() => {
          if (onSuccess) onSuccess(); 
          else onClose();
        }, 2000);

      } catch (err: any) {
        setErrorMsg("Error: " + err.message);
        setStep('error');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden relative">
        
        {step !== 'uploading' && step !== 'success' && (
          <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-slate-200 z-10"><X size={20} className="text-slate-500"/></button>
        )}

        <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
          
          {step === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-[#00C897] animate-spin mb-4"/>
              <p className="text-xs font-black uppercase text-slate-400">Verificando estatus...</p>
            </>
          )}

          {step === 'idle' && (
            <div className="space-y-6 animate-in zoom-in-95 w-full">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto">
                <LogIn size={40} strokeWidth={2.5}/>
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#0a1e3f] uppercase">¡Hola!</h2>
                <p className="text-xs font-bold text-slate-400 uppercase mt-2">Registra tu ENTRADA</p>
              </div>
              <button onClick={startCamera} className="w-full bg-[#00C897] hover:bg-[#00b085] text-[#0a1e3f] py-4 rounded-2xl font-black uppercase shadow-lg flex items-center justify-center gap-3">
                <Camera size={20}/> {location ? 'Registrar Entrada' : 'Buscando GPS...'}
              </button>
            </div>
          )}

          {step === 'working' && (
            <div className="space-y-6 animate-in zoom-in-95 w-full">
              <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto">
                <LogOut size={40} strokeWidth={2.5}/>
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#0a1e3f] uppercase">Cierre de Turno</h2>
                <p className="text-xs font-bold text-slate-400 uppercase mt-2">Registra tu SALIDA</p>
              </div>
              <button onClick={startCamera} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-black uppercase shadow-lg flex items-center justify-center gap-3">
                <Camera size={20}/> {location ? 'Registrar Salida' : 'Buscando GPS...'}
              </button>
            </div>
          )}

          {step === 'camera' && (
            <div className="w-full h-full flex flex-col items-center animate-in fade-in">
              <div className="relative w-full aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-inner mb-6">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <canvas ref={canvasRef} width={640} height={480} className="hidden" />
              </div>
              <button onClick={captureAndSubmit} className="w-16 h-16 bg-white border-4 border-[#00C897] rounded-full shadow-lg active:scale-90 transition-transform"></button>
            </div>
          )}

          {step === 'uploading' && (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 text-[#00C897] animate-spin mx-auto"/>
              <p className="text-xs font-black uppercase text-slate-500">Guardando...</p>
            </div>
          )}

          {step === 'success' && (
            <div className="space-y-4 animate-in zoom-in-95">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 size={48}/></div>
              <h2 className="text-2xl font-black text-[#0a1e3f]">¡Listo!</h2>
            </div>
          )}

          {step === 'completed' && (
            <div className="space-y-6 animate-in zoom-in-95">
              <div className="w-24 h-24 bg-[#0a1e3f] text-[#00C897] rounded-3xl flex items-center justify-center mx-auto"><ShieldCheck size={48}/></div>
              <h2 className="text-xl font-black text-[#0a1e3f] uppercase">Jornada Finalizada</h2>
              <p className="text-xs text-slate-400">Ya has completado tus registros de hoy.</p>
            </div>
          )}

          {step === 'error' && (
            <div className="space-y-4 animate-in shake">
              <p className="text-xs font-bold text-rose-500 uppercase">{errorMsg}</p>
              <button onClick={() => setStep('loading')} className="text-xs underline">Reintentar</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}