import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { patientId, title } = await req.json()

    if (!patientId) {
      return Response.json({ error: 'patientId es requerido' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verify patient belongs to doctor
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, full_name')
      .eq('id', patientId)
      .eq('doctor_id', user.id)
      .single()

    if (patientError || !patient) {
      return Response.json({ error: 'Paciente no encontrado' }, { status: 404 })
    }

    // Create new session linked to patient
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        doctor_id: user.id,
        patient_id: patientId,
        title: title || `Consulta - ${patient.full_name} - ${new Date().toLocaleDateString('es-AR')}`,
        is_active: true,
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Error creating session:', sessionError)
      return Response.json({ error: 'Error al crear sesion' }, { status: 500 })
    }

    // Log to audit
    await supabase.from('audit_logs').insert({
      action: 'session_created',
      actor_id: user.id,
      resource_type: 'session',
      resource_id: session.id,
      details: {
        patientId,
        patientName: patient.full_name,
        title: session.title,
      },
    })

    return Response.json({
      success: true,
      session: {
        id: session.id,
        patientId: session.patient_id,
        title: session.title,
        startedAt: session.started_at,
        isActive: session.is_active,
      },
    })
  } catch (error) {
    console.error('Create session API error:', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get user's sessions with patient info
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        *,
        patients (
          id,
          full_name,
          date_of_birth
        )
      `)
      .eq('doctor_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return Response.json({ error: 'Error al obtener sesiones' }, { status: 500 })
    }

    return Response.json({ sessions })
  } catch (error) {
    console.error('Get sessions API error:', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
