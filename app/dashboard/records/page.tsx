import { ArkivRecords } from '@/components/records/arkiv-records'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mis Registros Blockchain - NotarIA',
  description: 'Historial de registros y notarizaciones de pacientes y consultas en Arkiv Network.',
}

export default function RecordsPage() {
  return (
    <div className="p-6">
      <ArkivRecords />
    </div>
  )
}
