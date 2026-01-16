'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Camera, MapPin, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  type: 'ENTRADA' | 'SALIDA';
  onSuccess?: () => void;
}

export default function AttendanceModal({ isOpen, onClose, currentUser, type, onSuccess }: AttendanceModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState('');
  const [step, setStep] = useState<'camera' | 'preview' | 'success'>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // 1. INICIAR CAMARA Y GPS AL ABRIR
  useEffect(() => {
    if (isOpen) {
      startCamera();
      getLocation();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      alert("No pudimos acceder a la cámara. Verifica los permisos.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Tu navegador no soporta GPS");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setLocationError("Error obteniendo ubicación. Activa el GPS.")
    );
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        // Dibujar frame actual del video en el canvas
        context.drawImage(videoRef.current, 0, 0, 640, 480);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        setStep('preview');
      }
    }
  };

  const handleConfirm = async () => {
    if (!capturedImage || !location) return alert("Faltan datos de imagen o ubicación");
    setLoading(true);

    try {
      // 1. Subir Foto
      const blob = await (await fetch(capturedImage)).blob();
      const fileName = `${currentUser.id}_${Date.now()}.jpg`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attendance-evidence') // ⚠️ ASEGURATE QUE ESTE BUCKET EXISTA
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Obtener URL publica
      const { data: publicUrlData } = supabase.storage
        .from('attendance-evidence')
        .getPublicUrl(fileName);

      // 2. Guardar Registro en BD
      const { error: dbError } = await supabase.from('attendance_logs').insert([{
        user_id: currentUser.id,
        check_type: type,
        latitude: location.lat,
        longitude: location.lng,
        photo_url: publicUrlData.publicUrl
      }]);

      if (dbError) throw dbError;

      setStep('success');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);

    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in">
      
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className={`p-4 text-center text-white font-black uppercase tracking-widest ${type === 'ENTRADA' ? 'bg-emerald-500' : 'bg-orange-500'}`}>
           Registrar {type}
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="p-4 relative min-h-[400px] flex flex-col items-center justify-center bg-slate-900">
            
            {/* VISTA CÁMARA */}
            {step === 'camera' && (
                <>
                    <video ref={videoRef} autoPlay playsInline className="w-full h-80 object-cover rounded-2xl mb-4 transform -scale-x-100" />
                    <div className="absolute top-6 right-6 bg-black/50 text-white px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-2">
                        {location ? <><MapPin size={12} className="text-emerald-400"/> GPS ACTIVO</> : <><Loader2 size={12} className="animate-spin"/> BUSCANDO GPS...</>}
                    </div>
                </>
            )}

            {/* VISTA PREVIEW */}
            {step === 'preview' && capturedImage && (
                <img src={capturedImage} className="w-full h-80 object-cover rounded-2xl mb-4 transform -scale-x-100 border-4 border-white" />
            )}

            {/* VISTA EXITO */}
            {step === 'success' && (
                <div className="flex flex-col items-center justify-center h-80 text-white">
                    <CheckCircle2 size={64} className="text-emerald-400 mb-4"/>
                    <h3 className="text-xl font-black uppercase">¡Registro Exitoso!</h3>
                    <p className="text-sm opacity-80 mt-2">Tu asistencia ha sido guardada.</p>
                </div>
            )}

            {/* Canvas oculto para procesar la foto */}
            <canvas ref={canvasRef} width={640} height={480} className="hidden" />
        </div>

        {/* BOTONES DE ACCIÓN */}
        {step !== 'success' && (
             <div className="p-6 bg-white flex justify-between items-center gap-4">
                <button onClick={onClose} className="p-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500">
                    <X size={24}/>
                </button>

                {step === 'camera' ? (
                    <button 
                        onClick={handleCapture}
                        disabled={!location}
                        className="flex-1 bg-[#0a1e3f] text-white py-4 rounded-2xl font-black uppercase tracking-widest flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Camera size={20}/> Capturar
                    </button>
                ) : (
                    <>
                        <button onClick={() => { setCapturedImage(null); setStep('camera'); }} className="p-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500">
                            <RefreshCw size={24}/>
                        </button>
                        <button 
                            onClick={handleConfirm}
                            disabled={loading}
                            className={`flex-1 text-white py-4 rounded-2xl font-black uppercase tracking-widest flex justify-center items-center gap-2 ${type === 'ENTRADA' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-orange-500 hover:bg-orange-600'}`}
                        >
                             {loading ? <Loader2 className="animate-spin"/> : 'CONFIRMAR'}
                        </button>
                    </>
                )}
            </div>
        )}
      </div>
    </div>
  );
}