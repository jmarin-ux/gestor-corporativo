'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Send, MapPin, Loader2, ChevronDown, ShieldCheck, Phone, User, Camera, X, Info, Lock } from 'lucide-react';

const SERVICE_INFO = {
  "Correctivo Programado": "Reparación de un fallo o avería no crítica.",
  "Instalacion/Montaje": "Puesta en marcha o montaje de equipos o sistemas nuevos que requieren configuración inicial.",
  "Configuracion/Ajuste": "Solicitud para modificar parámetros, actualizar software o realizar ajustes finos a equipos ya instalados.",
  "Visita Tecnica": "Solicitud de visita o recorrido por parte de un especialista sin implicar una reparación inmediata.",
  "Conservacion Inmueble": "Solicitudes relacionadas con la infraestructura: electricidad, fontanería, pintura, etc.",
  "Correctivo Emergencia": "Fallo crítico o detención total de un equipo/sistema que requiere atención inmediata."
};

export default function ServiceForm({ currentUser }: { currentUser: any }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  
  const [formData, setFormData] = useState({
    service_type: '',
    location: '',
    description: '',
    phone: currentUser?.phone_number || currentUser?.phone || '', 
    full_name: currentUser?.full_name || '' 
  });

  // --- LÓGICA DE NOMENCLATURA RECUPERADA ---
  const generateServiceCode = (type: string) => {
    const prefixes: { [key: string]: string } = {
      "Correctivo Programado": "CP",
      "Instalacion/Montaje": "IM",
      "Configuracion/Ajuste": "CA",
      "Visita Tecnica": "VT",
      "Conservacion Inmueble": "CI",
      "Correctivo Emergencia": "ME"
    };

    const prefix = prefixes[type] || "SR"; // SR = Service Report (Genérico)
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // "25"
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // "12"
    const random = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 chars aleatorios

    return `${prefix}${year}${month}${random}`; // Ej: ME2512D2B4
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (selectedImages.length + filesArray.length > 3) {
        alert("Máximo 3 fotos permitidas.");
        return;
      }
      setSelectedImages([...selectedImages, ...filesArray]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email) return;

    setIsSubmitting(true);

    // Generamos el folio único antes de insertar
    const folio = generateServiceCode(formData.service_type);

    const { error } = await supabase.from('tickets').insert([
      {
        ...formData,
        codigo_servicio: folio, // Insertamos la nomenclatura
        client_email: currentUser.email.trim().toLowerCase(),
        company: currentUser.company || 'Particular',
        status: 'Sin asignar',
        priority: formData.service_type === 'Correctivo Emergencia' ? 'Urgente' : 'Normal'
      }
    ]);

    if (!error) router.push('/dashboard?role=client');
    else alert("Error al guardar: " + error.message);
    
    setIsSubmitting(false);
  };

  const inputStyles = "w-full bg-[#131c35] border border-slate-700/50 rounded-2xl p-4 pl-12 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-slate-500";
  const lockedInputStyles = `${inputStyles} opacity-50 cursor-not-allowed bg-slate-900/50 select-none border-dashed`;
  const labelStyles = "text-[11px] font-black uppercase text-slate-400 ml-4 tracking-[0.15em] flex items-center gap-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left relative z-20">
      
      {/* SECCIÓN: IDENTIDAD (BLOQUEADA) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className={labelStyles}>Nombre del Solicitante <Lock size={10}/></label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18}/>
            <input readOnly type="text" value={formData.full_name} className={lockedInputStyles} />
          </div>
        </div>
        <div className="space-y-3">
          <label className={labelStyles}>Teléfono de Contacto <Lock size={10}/></label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18}/>
            <input readOnly type="tel" value={formData.phone} className={lockedInputStyles} />
          </div>
        </div>
      </div>

      {/* CATEGORÍAS */}
      <div className="space-y-3">
        <label className={labelStyles}>Tipo de Mantenimiento Requerido *</label>
        <div className="relative">
          <select 
            required 
            className={`${inputStyles} pl-5 appearance-none pr-10 cursor-pointer`}
            onChange={(e) => setFormData({...formData, service_type: e.target.value})}
          >
            <option value="" className="bg-[#0a0f24]">Seleccione categoría...</option>
            {Object.keys(SERVICE_INFO).map((key) => (
              <option key={key} value={key} className="bg-[#0a0f24]">{key}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={20}/>
        </div>

        {formData.service_type && (
          <div className="p-4 rounded-xl border bg-blue-500/10 border-blue-500/20 animate-in fade-in duration-300">
            <div className="flex gap-3 text-blue-400">
              <Info size={16} className="shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 italic font-medium">
                {SERVICE_INFO[formData.service_type as keyof typeof SERVICE_INFO]}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* UBICACIÓN */}
      <div className="space-y-3">
        <label className={labelStyles}>Ubicación / Sucursal</label>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" size={18}/>
          <input required type="text" placeholder="Ej. Planta Norte o Local 45" className={inputStyles} onChange={(e)=>setFormData({...formData, location: e.target.value})}/>
        </div>
      </div>

      {/* FOTOS */}
      <div className="space-y-3">
        <label className={labelStyles}>Evidencia (Máx 3 fotos)</label>
        <div className="grid grid-cols-4 gap-4">
          {selectedImages.map((file, index) => (
            <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-slate-700/50">
              <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
              <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-lg"><X size={12}/></button>
            </div>
          ))}
          {selectedImages.length < 3 && (
            <label className="aspect-square rounded-xl border-2 border-dashed border-slate-700/50 flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 text-slate-500 hover:text-purple-500">
              <Camera size={24} />
              <span className="text-[10px] font-bold mt-1">AÑADIR</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
            </label>
          )}
        </div>
      </div>

      {/* DESCRIPCIÓN */}
      <div className="space-y-3">
        <label className={labelStyles}>Descripción de la Falla</label>
        <textarea required rows={4} placeholder="Detalle el problema aquí..." className="w-full bg-[#131c35] border border-slate-700/50 rounded-[1.5rem] p-6 text-sm text-white font-medium outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none italic" onChange={(e)=>setFormData({...formData, description: e.target.value})}/>
      </div>

      <button disabled={isSubmitting} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 py-5 rounded-full font-black uppercase tracking-[0.2em] shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
        {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : <><Send size={18}/> Enviar Reporte</>}
      </button>

      <div className="flex items-center justify-center gap-2 pt-2">
        <ShieldCheck size={12} className="text-slate-500"/>
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Autenticado como: {currentUser?.email}</p>
      </div>
    </form>
  );
}