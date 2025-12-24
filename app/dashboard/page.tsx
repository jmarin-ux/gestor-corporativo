import { supabase } from '@/lib/supabase'
import { UserTable } from '@/components/ui/UserTable'

export default async function DashboardPage() {
  // Consultamos los perfiles creados
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Panel de Control Operativo</h1>
      {error ? (
        <p className="text-red-500">Error al cargar datos</p>
      ) : (
        <UserTable users={profiles || []} />
      )}
    </div>
  )
}