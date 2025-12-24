import Link from 'next/link';
import { UserPlus, ClipboardList, LogIn } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Navbar Minimalista */}
      <nav className="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">
          GESTOR <span className="text-blue-700">OPERATIVO</span>
        </h1>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
          Control y Seguimiento Corporativo
        </h2>
        <p className="text-lg text-slate-600 mb-12 max-w-2xl mx-auto">
          Plataforma centralizada para la gestión de servicios, vinculación de mandos y despliegue técnico.
        </p>

        {/* Los 3 Accesos Principales */}
        <div className="grid md:grid-cols-3 gap-8 text-left">
          
          <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <UserPlus className="text-blue-700 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2 text-slate-800">Alta de Cliente</h3>
            <p className="text-slate-500 mb-6 text-sm">Registro inicial para nuevos clientes en la red operativa.</p>
            <Link href="/registro" className="block text-center bg-blue-700 text-white py-2 rounded-lg font-semibold hover:bg-blue-800 transition-colors">
              Iniciar Registro
            </Link>
          </div>

          <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <ClipboardList className="text-emerald-700 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2 text-slate-800">Solicitar Servicio</h3>
            <p className="text-slate-500 mb-6 text-sm">Levante una necesidad o requerimiento técnico inmediato.</p>
            <Link href="/solicitud" className="block text-center bg-emerald-700 text-white py-2 rounded-lg font-semibold hover:bg-emerald-800 transition-colors">
              Crear Ticket
            </Link>
          </div>

          <div className="bg-slate-900 p-8 rounded-xl shadow-lg text-white">
            <LogIn className="text-blue-400 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2">Acceso Staff</h3>
            <p className="text-slate-400 mb-6 text-sm">Panel para Administradores, Coordinadores y Operativos.</p>
            <Link href="/login" className="block text-center bg-white text-slate-900 py-2 rounded-lg font-semibold hover:bg-slate-100 transition-colors">
              Entrar al Panel
            </Link>
          </div>

        </div>
      </section>
    </main>
  );
}