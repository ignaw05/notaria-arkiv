import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardHeader } from '@/components/dashboard/sidebar'
import { SessionVerifier } from '@/components/audit/session-verifier'

export default async function VerifyPage() {
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

  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader 
        title="Verify Session Integrity" 
        description="Cryptographically verify the integrity of clinical AI sessions"
      />
      <div className="flex-1 overflow-auto p-6">
        <SessionVerifier userId={user.id} />
      </div>
    </div>
  )
}
