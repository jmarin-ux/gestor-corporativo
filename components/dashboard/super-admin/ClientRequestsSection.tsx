'use client'

import { useState } from 'react'
import ApproveClientRequestModal from './ApproveClientRequestModal'

export default function ClientRequestsSection({
  requests,
  currentUser,
  onRefresh,
}: {
  requests: any[]
  currentUser: any
  onRefresh: () => void
}) {
  const [selected, setSelected] = useState<any>(null)

  return (
    <div className="bg-white rounded-2xl border p-6">
      <h2 className="text-sm font-black uppercase mb-4">
        Solicitudes de acceso
      </h2>

      {requests.length === 0 ? (
        <p className="text-slate-400 text-sm">
          No hay solicitudes pendientes
        </p>
      ) : (
        <table className="w-full">
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-2 font-bold">{r.full_name}</td>
                <td className="py-2 text-slate-500">{r.email}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => setSelected(r)}
                    className="bg-[#0a1e3f] text-white px-4 py-2 rounded-xl text-xs font-black"
                  >
                    Revisar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <ApproveClientRequestModal
          request={selected}
          isOpen={true}
          currentUser={currentUser}
          onClose={() => setSelected(null)}
          onApproved={onRefresh}
        />
      )}
    </div>
  )
}
