// 1. DICCIONARIO DE CÓDIGOS (Según tu imagen de tipos de mant.)
export const SERVICE_PREFIXES: Record<string, string> = {
    'Mantenimiento Correctivo Programado': 'CP',
    'Instalación/Montaje': 'IM',
    'Configuración/Ajuste': 'CA',
    'Visita Técnica o Levantamiento': 'VT',
    'Conservación de Inmueble': 'CI',
    'Mantenimiento Correctivo (Emergencia)': 'CE',
};

// 2. GENERADOR DE FOLIOS (XX + MES + AÑO + RANDOM 4)
export const generateServiceCode = (serviceType: string) => {
    const prefix = SERVICE_PREFIXES[serviceType] || 'GEN';
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 01, 05, 12
    const year = String(now.getFullYear()).slice(-2); // 25, 26
    const random = Math.floor(1000 + Math.random() * 9000); // 4 dígitos al azar
    return `${prefix}${month}${year}${random}`;
};

// 3. MAPA DE COLORES DE ESTATUS (Clean Turquesa Style)
export const getStatusColor = (status: string) => {
    switch (status) {
        case 'Asignado': return 'bg-blue-100 text-blue-600 border-blue-200';
        case 'Pendiente': return 'bg-amber-100 text-amber-600 border-amber-200';
        case 'En proceso': return 'bg-[#00C897]/10 text-[#00C897] border-[#00C897]/20';
        case 'Ejecutado': return 'bg-purple-100 text-purple-600 border-purple-200';
        case 'Realizado': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'Cancelado': return 'bg-red-50 text-red-500 border-red-100';
        case 'Cerrado': return 'bg-slate-100 text-slate-500 border-slate-200';
        default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
};