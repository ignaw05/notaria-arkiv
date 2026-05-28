import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardHeader } from '@/components/dashboard/sidebar'
import { AuditSessionDetail } from '@/components/audit/session-detail'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AuditSessionPage({ params }: PageProps) {
  const { id } = await params
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

  // Fetch session with messages and doctor info
  const { data: session, error } = await supabase
    .from('sessions')
    .select(`
      *,
      profiles:doctor_id(full_name, email, institution, specialty),
      messages:messages(*),
      decisions:decisions(*)
    `)
    .eq('id', id)
    .single()

  if (error || !session) {
    notFound()
  }

  // Sort messages by created_at
  const sortedMessages = session.messages?.sort(
    (a: { created_at: string }, b: { created_at: string }) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  ) || []

  // Fetch verification history
  const { data: verifications } = await supabase
    .from('integrity_verifications')
    .select(`
      *,
      profiles:verified_by(full_name, email)
    `)
    .eq('session_id', id)
    .order('verified_at', { ascending: false })

  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader 
        title="Audit Session" 
        description={`Session ID: ${id.slice(0, 8)}...`}
      />
      <div className="flex-1 overflow-auto p-6">
        <AuditSessionDetail 
          session={session} 
          messages={sortedMessages}
          verifications={verifications || []}
          auditorId={user.id}
        />
      </div>
    </div>
  )
}
