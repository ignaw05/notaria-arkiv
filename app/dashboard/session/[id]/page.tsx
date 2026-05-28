import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardHeader } from '@/components/dashboard/sidebar'
import { SessionDetail } from '@/components/clinical/session-detail'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SessionPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch session with messages
  const { data: session, error } = await supabase
    .from('sessions')
    .select(`
      *,
      messages:messages(*)
    `)
    .eq('id', id)
    .eq('doctor_id', user.id)
    .single()

  if (error || !session) {
    notFound()
  }

  // Sort messages by created_at
  const sortedMessages = session.messages?.sort(
    (a: { created_at: string }, b: { created_at: string }) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  ) || []

  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader 
        title={session.title || 'Session Details'} 
        description={`Patient: ${session.patient_hash}`}
      />
      <div className="flex-1 overflow-auto p-6">
        <SessionDetail session={session} messages={sortedMessages} />
      </div>
    </div>
  )
}
