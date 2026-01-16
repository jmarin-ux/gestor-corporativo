'use client'

import PlannerView from '@/components/dashboard/PlannerView'
import ServiceTable from '@/components/dashboard/ServiceTable'
import AssetsTab from '@/components/dashboard/AssetsTab'

type Props = {
  currentUser: any
  clients: any[]
  services: any[]
  assets: any[]
  staff: any[]
  onRefresh?: () => void | Promise<void>
  onOpenDetails?: (ticket: any) => void
  onCreateAsset?: () => void
  onEditAsset?: (asset: any) => void
}

export default function SharedOpsView({
  currentUser,
  clients,
  services,
  assets,
  staff,
  onRefresh,
  onOpenDetails,
  onCreateAsset,
  onEditAsset,
}: Props) {
  return (
    <div className="space-y-6">
      <PlannerView currentUser={currentUser} />

      <ServiceTable
        services={services}
        staff={staff}
        currentUser={currentUser}
        onOpenDetails={onOpenDetails}
        onRefresh={onRefresh}
      />

      <AssetsTab
        assets={assets}
        clients={clients}
        currentUser={currentUser}
        onCreate={onCreateAsset}
        onEdit={onEditAsset}
        onRefresh={onRefresh}
      />
    </div>
  )
}
