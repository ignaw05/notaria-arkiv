import { createClient } from '@/lib/supabase/server'
import { generatePatientHash } from '@/lib/crypto'

export async function POST(req: Request) {
  try {
    const { patientId, title } = await req.json()

    if (!patientId) {
      return Response.json({ error: 'patientId is required' }, { status: 400 })
    }

    // Verify authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile for institution
    const { data: profile } = await supabase
      .from('profiles')
      .select('institution')
      .eq('id', user.id)
      .single()

    // Generate anonymized patient hash
    const institutionSalt = profile?.institution || 'default'
    const patientHash = await generatePatientHash(patientId, institutionSalt)

    // Create new session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        doctor_id: user.id,
        patient_hash: patientHash,
        title: title || `Consulta ${new Date().toLocaleDateString()}`,
        is_active: true,
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Error creating session:', sessionError)
      return Response.json({ error: 'Failed to create session' }, { status: 500 })
    }

    // Log to audit
    await supabase.from('audit_logs').insert({
      action: 'session_created',
      actor_id: user.id,
      resource_type: 'session',
      resource_id: session.id,
      details: {
        patientHash,
        title: session.title,
      },
    })

    return Response.json({
      success: true,
      session: {
        id: session.id,
        patientHash: session.patient_hash,
        title: session.title,
        startedAt: session.started_at,
        isActive: session.is_active,
      },
    })
  } catch (error) {
    console.error('Create session API error:', error)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Verify authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's sessions
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('doctor_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return Response.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    return Response.json({ sessions })
  } catch (error) {
    console.error('Get sessions API error:', error)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
