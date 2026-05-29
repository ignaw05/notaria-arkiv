import { ActivityLog } from '@/components/activity/activity-log'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mi Actividad y Auditoría - NotarIA',
  description: 'Bitácora de auditoría e historial de actividades del profesional.',
}

export default function ActivityPage() {
  return (
    <div className="p-6">
      <ActivityLog />
    </div>
  )
}
