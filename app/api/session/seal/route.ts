import { createClient } from '@/lib/supabase/server'
import { generateHash } from '@/lib/crypto'
import { registerSessionOnArkiv, isArkivConfigured } from '@/lib/arkiv'

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json()

    if (!sessionId) {
      return Response.json({ error: 'sessionId es requerido' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get session with patient info
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*, patients(id, full_name)')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return Response.json({ error: 'Sesion no encontrada' }, { status: 404 })
    }

    if (session.doctor_id !== user.id) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!session.is_active) {
      return Response.json({ error: 'La sesion ya esta sellada' }, { status: 400 })
    }

    // Get all messages ordered by creation date
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      return Response.json({ error: 'Error al obtener mensajes' }, { status: 500 })
    }

    if (!messages || messages.length === 0) {
      return Response.json({ error: 'No se puede sellar una sesion vacia' }, { status: 400 })
    }

    // Generate standardized conversation string
    // Format: "user: mensaje1 | assistant: mensaje2 | user: mensaje3 ..."
    const conversationString = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join(' | ')

    // Generate SHA-256 hash of the entire conversation
    const sessionHash = await generateHash(conversationString)

    const closedAt = new Date().toISOString()
    let arkivEntityId: string | null = null
    let arkivTxHash: string | null = null

    // Register on Arkiv Network if configured
    if (isArkivConfigured()) {
      try {
        const arkivResult = await registerSessionOnArkiv(
          sessionId,
          sessionHash,
          {
            doctorId: user.id,
            patientId: session.patient_id || 'anonymous',
            messageCount: messages.length,
            sealedAt: closedAt,
          }
        )
        arkivEntityId = arkivResult.entityId
        arkivTxHash = arkivResult.txHash
      } catch (arkivError) {
        console.error('[Arkiv] Error registering session:', arkivError)
        // Continue without Arkiv - store hash locally at minimum
      }
    } else {
      console.log('[Arkiv] Not configured - storing hash locally only')
      // Generate a local-only entity ID for tracking
      arkivEntityId = `local_${sessionId}_${Date.now()}`
    }

    // Update session: mark as sealed
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        is_active: false,
        closed_at: closedAt,
        session_hash: sessionHash,
        arkiv_entity_id: arkivEntityId,
        updated_at: closedAt,
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Error sealing session:', updateError)
      return Response.json({ error: 'Error al sellar sesion' }, { status: 500 })
    }

    // Log to audit
    await supabase.from('audit_logs').insert({
      action: 'session_sealed',
      actor_id: user.id,
      resource_type: 'session',
      resource_id: sessionId,
      details: {
        sessionHash,
        arkivEntityId,
        arkivTxHash,
        arkivConfigured: isArkivConfigured(),
        messageCount: messages.length,
        closedAt,
        patientId: session.patient_id,
      },
    })

    return Response.json({
      success: true,
      sessionId,
      sessionHash,
      arkivEntityId,
      arkivTxHash,
      arkivConfigured: isArkivConfigured(),
      messageCount: messages.length,
      closedAt,
    })
  } catch (error) {
    console.error('Seal API error:', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
