import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardHeader } from '@/components/dashboard/sidebar'
import { SessionList } from '@/components/clinical/session-list'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch user's sessions
  const { data: sessions } = await supabase
    .from('sessions')
    .select(`
      *,
      messages:messages(count),
      decisions:decisions(count)
    `)
    .eq('doctor_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader 
        title="Session History" 
        description="View and review your past clinical sessions"
      />
      <div className="flex-1 overflow-auto p-6">
        <SessionList sessions={sessions || []} userId={user.id} />
      </div>
    </div>
  )
}
