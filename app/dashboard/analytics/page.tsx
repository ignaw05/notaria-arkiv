import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardHeader } from '@/components/dashboard/sidebar'
import { AnalyticsDashboard } from '@/components/analytics/dashboard'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Verify appropriate role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['auditor', 'compliance_officer', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  // Fetch analytics data
  const { data: sessionsPerDay } = await supabase.rpc('get_sessions_per_day')
  const { data: messagesByRole } = await supabase.rpc('get_messages_by_role')
  const { data: riskDistribution } = await supabase.rpc('get_risk_distribution')

  // Fallback to simple counts if RPCs don't exist
  const { count: totalSessions } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })

  const { count: totalMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })

  const { count: totalDecisions } = await supabase
    .from('decisions')
    .select('*', { count: 'exact', head: true })

  const { count: totalDoctors } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'doctor')

  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader 
        title="Analytics" 
        description="Platform-wide usage and compliance metrics"
      />
      <div className="flex-1 overflow-auto p-6">
        <AnalyticsDashboard
          stats={{
            totalSessions: totalSessions || 0,
            totalMessages: totalMessages || 0,
            totalDecisions: totalDecisions || 0,
            totalDoctors: totalDoctors || 0,
          }}
        />
      </div>
    </div>
  )
}
