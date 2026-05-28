import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardHeader } from '@/components/dashboard/sidebar'
import { ClinicalChat } from '@/components/clinical/chat'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Only doctors/admins can access clinical chat
  if (profile?.role !== 'doctor' && profile?.role !== 'admin') {
    redirect('/dashboard/audit')
  }

  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader 
        title="Clinical AI Assistant" 
        description="Start a new clinical consultation session"
      />
      <div className="flex-1 overflow-hidden">
        <ClinicalChat userId={user.id} profile={profile} />
      </div>
    </div>
  )
}
