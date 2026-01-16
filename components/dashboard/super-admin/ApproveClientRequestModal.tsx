'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-browser'

export default function ApproveClientRequestModal({
  request,
  isOpen,
  onClose,
  onApproved,
}: any) {
  const [coordinators, setCoordinators] = useState<any[]>([])
  const [coordinatorId, setCoordinatorId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name')
      .in('role', ['admin', 'coordinador'])
      .then(({ data }) => setCoordinators(data || []))
  }, [])

  if (!isOpen) return null

  const approve = async () => {
    if (!coordinatorId) {
      setError('Debes asignar un coordinador')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: request.email,
          password: request.password_hash,
          full_name: request.full_name,
          role: 'client',
          coordinator_id: coordinatorId,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      await supabase.from('client_requests').delete().eq('id', request.id)

      onApproved()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
      <div className="bg-white p-8 rounded-3xl w-full max-w-lg">
        <h3 className="font-black text-lg mb-2">Aprobar cliente</h3>
        <p className="text-sm text-slate-500 mb-4">{request.email}</p>

        <select
          value={coordinatorId}
          onChange={(e) => setCoordinatorId(e.target.value)}
          className="w-full border rounded-xl px-4 py-3 mb-4"
        >
          <option value="">-- Coordinador --</option>
          {coordinators.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </select>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          onClick={approve}
          disabled={loading}
          className="w-full bg-[#0a1e3f] text-white py-3 rounded-xl font-black"
        >
          {loading ? 'Procesando...' : 'Aprobar'}
        </button>
      </div>
    </div>
  )
}
