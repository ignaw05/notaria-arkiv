import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardHeader } from '@/components/dashboard/sidebar'
import { AuditOverview } from '@/components/audit/overview'

export default async function AuditPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Verify auditor role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['auditor', 'compliance_officer', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  // Fetch audit statistics
  const { data: sessions } = await supabase
    .from('sessions')
    .select(`
      id,
      doctor_id,
      patient_hash,
      title,
      is_active,
      session_hash,
      created_at,
      closed_at,
      profiles:doctor_id(full_name, email, institution)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  const { count: totalSessions } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })

  const { count: activeSessions } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const { count: totalMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })

  const { count: verifiedSessions } = await supabase
    .from('integrity_verifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_valid', true)

  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader 
        title="Audit Dashboard" 
        description="Monitor clinical AI sessions and verify integrity"
      />
      <div className="flex-1 overflow-auto p-6">
      <AuditOverview
        sessions={sessions?.map(s => ({
          ...s,
          profiles: Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
        })) || []}
        stats={{
          totalSessions: totalSessions || 0,
          activeSessions: activeSessions || 0,
          totalMessages: totalMessages || 0,
          verifiedSessions: verifiedSessions || 0,
        }}
      />
      </div>
    </div>
  )
}
