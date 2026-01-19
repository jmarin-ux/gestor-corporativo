'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Camera, MapPin, Loader2, CheckCircle2, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
  type?: 'ENTRADA' | 'SALIDA'; // Ya no es obligatorio, se calcula solo
  onSuccess?: () => void;
}

export default function AttendanceModal({ isOpen, onClose, currentUser, onSuccess }: AttendanceModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [step, setStep] = useState<'checking' | 'camera' | 'preview' | 'success' | 'blocked'>('checking');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Estados para reglas de negocio
  const [distanceInfo, setDistanceInfo] = useState<string>(''); 
  const [isOutOfRange, setIsOutOfRange] = useState(false); 
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Estado determinado automáticamente
  const [determinedType, setDeterminedType] = useState<'ENTRADA' | 'SALIDA' | null>(null);

  // 1. VERIFICAR ESTADO DEL DÍA AL ABRIR
  useEffect(() => {
    if (isOpen) {
        checkDailyStatus();
    }
    return stopCamera;
  }, [isOpen]);

  const checkDailyStatus = async () => {
    setStep('checking');
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = `${today}T00:00:00.000Z`;
    const endOfDay = `${today}T23:59:59.999Z`;

    // Consultamos cuántos registros tiene el usuario HOY
    const { count, error } = await supabase
        .from('attendance_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

    if (error) {
        alert("Error verificando estatus: " + error.message);
        onClose();
        return;
    }

    const recordsCount = count || 0;

    // --- REGLA DE NEGOCIO ---
    if (recordsCount === 0) {
        setDeterminedType('ENTRADA');
        startCamera();
        getLocation();
        setStep('camera');
    } else if (recordsCount === 1) {
        setDeterminedType('SALIDA');
        startCamera();
        getLocation();
        setStep('camera');
    } else {
        // Ya tiene 2 o más registros (Entrada y Salida completas)
        setStep('blocked');
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch {
      // Si falla la cámara, no hacemos alert invasivo, mostramos UI
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  };

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
         const current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
         setLocation(current);
         const dist = calculateDistance(current.lat, current.lng, OFFICE_LOCATION.lat, OFFICE_LOCATION.lng);
         setDistanceInfo(`${Math.round(dist)}m`);
         // if (dist > MAX_DISTANCE_METERS) setIsOutOfRange(true);
      },
      () => console.warn('GPS no disponible')
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
    if (!capturedImage || !location || !determinedType) return alert('Faltan datos');
    setLoading(true);

    try {
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });

      // Compresión
      const compressed = await compressImage(file);
      const fileName = `${currentUser.id}_${Date.now()}.jpg`;

      // Subida (Bucket 'asistencias')
      const { error: uploadError } = await supabase.storage
        .from('asistencias') 
        .upload(fileName, compressed, { contentType: 'image/jpeg', upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('asistencias')
        .getPublicUrl(fileName);

      // Guardado con el TIPO AUTOMÁTICO
      const { error: dbError } = await supabase.from('attendance_logs').insert({
        user_id: currentUser.id,
        check_type: determinedType, // Usamos la variable calculada
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
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl">

        {/* HEADER DINÁMICO */}
        <div className={`p-4 text-center text-white font-black uppercase tracking-widest ${
            step === 'blocked' ? 'bg-slate-500' :
            determinedType === 'ENTRADA' ? 'bg-emerald-500' : 
            determinedType === 'SALIDA' ? 'bg-orange-500' : 'bg-[#0a1e3f]'
        }`}>
          {step === 'checking' && "Verificando..."}
          {step === 'blocked' && "Registro Completado"}
          {(step === 'camera' || step === 'preview' || step === 'success') && `Registrar ${determinedType}`}
        </div>

        <div className="p-4 bg-slate-900 relative min-h-[400px] flex flex-col justify-center items-center">
          
          {/* ESTADO 1: VERIFICANDO */}
          {step === 'checking' && (
              <Loader2 className="animate-spin text-white w-12 h-12"/>
          )}

          {/* ESTADO 2: BLOQUEADO (YA CHECÓ TODO) */}
          {step === 'blocked' && (
              <div className="text-center text-white px-6">
                  <ShieldAlert className="w-16 h-16 text-amber-400 mx-auto mb-4"/>
                  <h3 className="text-xl font-bold uppercase mb-2">Jornada Finalizada</h3>
                  <p className="text-sm opacity-80">Ya has registrado tu Entrada y tu Salida el día de hoy.</p>
                  <p className="text-xs mt-4 text-slate-400">Vuelve mañana para registrar asistencia.</p>
              </div>
          )}

          {/* ESTADO 3: CÁMARA ACTIVA */}
          {step === 'camera' && (
            <>
              <video ref={videoRef} autoPlay playsInline className="w-full h-80 object-cover rounded-xl -scale-x-100" />
              <div className="absolute top-4 right-4 text-white text-xs flex gap-2 items-center bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
                {location ? (
                    <span className={`flex items-center gap-1 font-bold ${isOutOfRange ? 'text-red-400' : 'text-emerald-400'}`}>
                        <MapPin size={12} /> {isOutOfRange ? `LEJOS (${distanceInfo})` : `GPS OK`}
                    </span>
                ) : (
                    <span className="flex items-center gap-1 text-white">
                        <Loader2 className="animate-spin" size={12} /> BUSCANDO...
                    </span>
                )}
              </div>
            </>
          )}

          {/* ESTADO 4: PREVIEW DE FOTO */}
          {step === 'preview' && capturedImage && (
            <img src={capturedImage} className="w-full h-80 object-cover rounded-xl -scale-x-100 border-4 border-white" alt="preview" />
          )}

          {/* ESTADO 5: ÉXITO */}
          {step === 'success' && (
            <div className="h-80 flex flex-col items-center justify-center text-white">
              <CheckCircle2 size={64} className="text-emerald-400" />
              <p className="mt-4 font-bold text-xl uppercase">¡{determinedType} Registrada!</p>
            </div>
          )}

          <canvas ref={canvasRef} width={640} height={480} className="hidden" />
        </div>

        {/* FOOTER / BOTONES */}
        <div className="p-4 flex gap-4">
            <button onClick={onClose} className="p-4 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500">
                <X />
            </button>

            {/* BOTÓN CAPTURAR */}
            {step === 'camera' && (
              <button
                onClick={handleCapture}
                disabled={!location || isOutOfRange}
                className={`flex-1 text-white rounded-xl font-black transition-all flex items-center justify-center gap-2 ${
                    !location || isOutOfRange ? 'bg-slate-500 cursor-not-allowed' : 'bg-[#0a1e3f]'
                }`}
              >
                <Camera size={20} /> Capturar
              </button>
            )}

            {/* BOTÓN CONFIRMAR */}
            {step === 'preview' && (
              <>
                <button onClick={() => setStep('camera')} className="p-4 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500">
                    <RefreshCw />
                </button>
                <button 
                    onClick={handleConfirm} 
                    disabled={loading} 
                    className={`flex-1 text-white rounded-xl font-black flex items-center justify-center gap-2 ${
                        determinedType === 'ENTRADA' ? 'bg-emerald-500' : 'bg-orange-500'
                    }`}
                >
                  {loading ? <Loader2 className="animate-spin" /> : 'Confirmar'}
                </button>
              </>
            )}
            
            {/* Si está bloqueado o cargando, solo mostramos el botón de cerrar (la X ya está arriba) */}
        </div>
      </div>
    </div>
  );
}