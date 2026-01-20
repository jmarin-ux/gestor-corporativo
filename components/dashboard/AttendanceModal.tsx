'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Camera, MapPin, Loader2, CheckCircle2, RefreshCw, AlertTriangle, ShieldAlert, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase-browser'; // Asegúrate de la ruta correcta

/* ---------------------------------------------------
   1. REGLA DE GEOCERCA (DISTANCIA)
--------------------------------------------------- */
const OFFICE_LOCATION = { lat: 19.4326, lng: -99.1332 }; 
const MAX_DISTANCE_METERS = 500; 

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; 
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
};

/* ---------------------------------------------------
   2. REGLA DE COMPRESIÓN DE IMAGEN
--------------------------------------------------- */
const compressImage = async (file: File, quality = 0.6, maxWidth = 1000): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Error al comprimir'));
            resolve(blob);
          }, 'image/jpeg', quality);
      };
    };
    reader.onerror = reject;
  });
};

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  type?: 'ENTRADA' | 'SALIDA'; 
  onSuccess?: () => void;
}

export default function AttendanceModal({ isOpen, onClose, currentUser, onSuccess }: AttendanceModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [step, setStep] = useState<'checking' | 'camera' | 'preview' | 'success' | 'blocked'>('checking');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Estados de reglas
  const [distanceInfo, setDistanceInfo] = useState<string>(''); 
  const [isOutOfRange, setIsOutOfRange] = useState(false); 
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Estado determinado automáticamente
  const [determinedType, setDeterminedType] = useState<'ENTRADA' | 'SALIDA' | null>(null);
  
  // 🔴 NUEVO: Detectar si fue cierre automático
  const [isAutoClosed, setIsAutoClosed] = useState(false);

  // 1. VERIFICAR ESTADO DEL DÍA AL ABRIR
  useEffect(() => {
    if (isOpen) {
        checkDailyStatus();
    }
    return stopCamera;
  }, [isOpen]);

  const checkDailyStatus = async () => {
    setStep('checking');
    setIsAutoClosed(false); // Reset

    const today = new Date().toISOString().split('T')[0];
    const startOfDay = `${today}T00:00:00.000Z`;
    const endOfDay = `${today}T23:59:59.999Z`;

    // 🔍 CAMBIO: Traemos los datos (check_type) en lugar de solo contar
    const { data: logs, error } = await supabase
        .from('attendance_logs')
        .select('check_type, created_at')
        .eq('user_id', currentUser.id)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: true }); // Importante el orden

    if (error) {
        alert("Error verificando estatus: " + error.message);
        onClose();
        return;
    }

    const recordsCount = logs?.length || 0;

    // --- LÓGICA DE FLUJO ---
    if (recordsCount === 0) {
        // No hay nada -> Toca ENTRADA
        setDeterminedType('ENTRADA');
        startCamera();
        getLocation();
        setStep('camera');
    } else if (recordsCount === 1) {
        // Hay 1 registro (Entrada) -> Toca SALIDA
        setDeterminedType('SALIDA');
        startCamera();
        getLocation();
        setStep('camera');
    } else {
        // Ya tiene 2 o más registros (Jornada cerrada)
        // 🔴 Verificamos si el último registro fue automático
        const lastLog = logs![logs!.length - 1];
        if (lastLog.check_type === 'SALIDA_AUTO') {
            setIsAutoClosed(true);
        }
        setStep('blocked');
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch {
      console.warn("Cámara no disponible o permisos denegados");
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  };

  const getLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
         const current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
         setLocation(current);
         const dist = calculateDistance(current.lat, current.lng, OFFICE_LOCATION.lat, OFFICE_LOCATION.lng);
         setDistanceInfo(`${Math.round(dist)}m`);
         // Descomentar si quieres bloquear por distancia
         // if (dist > MAX_DISTANCE_METERS) setIsOutOfRange(true);
      },
      (err) => console.warn('GPS Error:', err),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, 640, 480);
    const img = canvasRef.current.toDataURL('image/jpeg', 0.9);
    setCapturedImage(img);
    setStep('preview');
  };

  const handleConfirm = async () => {
    if (!capturedImage || !location || !determinedType) return alert('Faltan datos (GPS o Foto)');
    setLoading(true);

    try {
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });

      // Compresión
      const compressed = await compressImage(file);
      const fileName = `${currentUser.id}_${Date.now()}.jpg`;

      // Subida
      const { error: uploadError } = await supabase.storage
        .from('asistencias') 
        .upload(fileName, compressed, { contentType: 'image/jpeg', upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('asistencias')
        .getPublicUrl(fileName);

      // Guardado
      const { error: dbError } = await supabase.from('attendance_logs').insert({
        user_id: currentUser.id,
        check_type: determinedType, 
        latitude: location.lat,
        longitude: location.lng,
        photo_url: data.publicUrl
      });

      if (dbError) throw dbError;

      setStep('success');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (e: any) {
      console.error(e);
      alert("Error al guardar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative">

        {/* HEADER DINÁMICO */}
        <div className={`p-4 text-center text-white font-black uppercase tracking-widest transition-colors ${
            step === 'blocked' && isAutoClosed ? 'bg-rose-600' : // Rojo si fue automático
            step === 'blocked' ? 'bg-slate-500' :
            determinedType === 'ENTRADA' ? 'bg-emerald-500' : 
            determinedType === 'SALIDA' ? 'bg-orange-500' : 'bg-[#0a1e3f]'
        }`}>
          {step === 'checking' && "Sincronizando..."}
          {step === 'blocked' && (isAutoClosed ? "ATENCIÓN REQUERIDA" : "Jornada Finalizada")}
          {(step === 'camera' || step === 'preview' || step === 'success') && `Registrar ${determinedType}`}
        </div>

        <div className="p-4 bg-slate-900 relative min-h-[400px] flex flex-col justify-center items-center">
          
          {/* ESTADO 1: VERIFICANDO */}
          {step === 'checking' && (
              <Loader2 className="animate-spin text-white w-12 h-12"/>
          )}

          {/* ESTADO 2: BLOQUEADO (YA CHECÓ O CIERRE AUTO) */}
          {step === 'blocked' && (
              <div className="text-center text-white px-6 animate-in zoom-in">
                  {isAutoClosed ? (
                      // 🔴 MENSAJE DE CIERRE AUTOMÁTICO
                      <>
                        <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-rose-500">
                            <Clock className="w-10 h-10 text-rose-500"/>
                        </div>
                        <h3 className="text-xl font-black uppercase mb-2 text-rose-400">Sin Checada de Salida</h3>
                        <p className="text-sm opacity-90 leading-relaxed">
                            El sistema cerró tu jornada automáticamente a las 18:00 hrs porque no registraste tu salida.
                        </p>
                        <div className="mt-6 bg-rose-900/50 p-3 rounded-xl border border-rose-500/30">
                            <p className="text-[10px] font-bold uppercase text-rose-300">Esto quedará registrado en tu reporte.</p>
                        </div>
                      </>
                  ) : (
                      // 🟢 MENSAJE NORMAL
                      <>
                        <ShieldAlert className="w-16 h-16 text-emerald-400 mx-auto mb-4"/>
                        <h3 className="text-xl font-bold uppercase mb-2">¡Todo Listo!</h3>
                        <p className="text-sm opacity-80">Ya has completado tus registros de Entrada y Salida por hoy.</p>
                        <p className="text-xs mt-4 text-slate-400">Nos vemos mañana.</p>
                      </>
                  )}
              </div>
          )}

          {/* ESTADO 3: CÁMARA ACTIVA */}
          {step === 'camera' && (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-80 object-cover rounded-xl -scale-x-100 bg-black" />
              <div className="absolute top-6 right-6 text-white text-xs flex gap-2 items-center bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                {location ? (
                    <span className={`flex items-center gap-1.5 font-bold ${isOutOfRange ? 'text-red-400' : 'text-emerald-400'}`}>
                        <MapPin size={12} /> {isOutOfRange ? `FUERA DE RANGO (${distanceInfo})` : `GPS ACTIVO`}
                    </span>
                ) : (
                    <span className="flex items-center gap-1.5 text-slate-300">
                        <Loader2 className="animate-spin" size={12} /> BUSCANDO UBICACIÓN...
                    </span>
                )}
              </div>
            </>
          )}

          {/* ESTADO 4: PREVIEW DE FOTO */}
          {step === 'preview' && capturedImage && (
            <img src={capturedImage} className="w-full h-80 object-cover rounded-xl -scale-x-100 border-4 border-white shadow-lg" alt="preview" />
          )}

          {/* ESTADO 5: ÉXITO */}
          {step === 'success' && (
            <div className="h-80 flex flex-col items-center justify-center text-white animate-in zoom-in">
              <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={64} className="text-emerald-400" />
              </div>
              <p className="font-black text-2xl uppercase tracking-tight">¡Registrado!</p>
              <p className="text-emerald-200 text-sm font-bold mt-1 uppercase">{determinedType} Exitosa</p>
            </div>
          )}

          <canvas ref={canvasRef} width={640} height={480} className="hidden" />
        </div>

        {/* FOOTER / BOTONES */}
        <div className="p-5 flex gap-4 bg-white border-t border-slate-100">
            <button onClick={onClose} className="p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 text-slate-500 transition-colors border border-slate-200">
                <X />
            </button>

            {/* BOTÓN CAPTURAR */}
            {step === 'camera' && (
              <button
                onClick={handleCapture}
                disabled={!location || isOutOfRange}
                className={`flex-1 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg ${
                    !location || isOutOfRange 
                    ? 'bg-slate-400 cursor-not-allowed grayscale' 
                    : 'bg-[#0a1e3f] hover:bg-blue-900 active:scale-95'
                }`}
              >
                <Camera size={20} /> Tomar Foto
              </button>
            )}

            {/* BOTÓN CONFIRMAR */}
            {step === 'preview' && (
              <>
                <button onClick={() => setStep('camera')} className="p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 text-slate-500 transition-colors border border-slate-200">
                    <RefreshCw />
                </button>
                <button 
                    onClick={handleConfirm} 
                    disabled={loading} 
                    className={`flex-1 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95 ${
                        determinedType === 'ENTRADA' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-orange-500 hover:bg-orange-600'
                    }`}
                >
                  {loading ? <Loader2 className="animate-spin" /> : 'Confirmar'}
                </button>
              </>
            )}
            
            {/* Si está bloqueado, el botón de cerrar (X) es suficiente */}
        </div>
      </div>
    </div>
  );
}