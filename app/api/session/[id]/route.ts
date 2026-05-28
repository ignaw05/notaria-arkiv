import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionId = (await params).id
  const supabase = await createClient()

  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get session with messages
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify access (doctor or auditor)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const canAccess =
      session.doctor_id === user.id ||
      (profile && ['auditor', 'compliance_officer', 'admin'].includes(profile.role))

    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get messages
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    // Get patient if linked
    let patient = null
    if (session.patient_id) {
      const { data: patientData } = await supabase
        .from('patients')
        .select('*')
        .eq('id', session.patient_id)
        .single()
      patient = patientData
    }

    return NextResponse.json({
      session,
      messages: messages || [],
      patient,
    })
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
