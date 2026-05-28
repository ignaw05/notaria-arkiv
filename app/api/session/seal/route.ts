import { createClient } from '@/lib/supabase/server'
import { generateHash } from '@/lib/crypto'

// Arkiv SDK mock - replace with actual SDK when available
async function createArkivEntity(data: {
  type: string
  attributes: Record<string, unknown>
}): Promise<{ entityId: string }> {
  // TODO: Replace with actual Arkiv SDK call
  // const arkiv = new ArkivClient(process.env.ARKIV_API_KEY)
  // return await arkiv.createEntity(data)
  
  // Mock implementation for demo
  const entityId = `arkiv_${Date.now()}_${Math.random().toString(36).substring(7)}`
  console.log('[Arkiv] Creating entity:', { entityId, ...data })
  return { entityId }
}

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json()

    if (!sessionId) {
      return Response.json({ error: 'sessionId is required' }, { status: 400 })
    }

    // Verify authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return Response.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.doctor_id !== user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.is_active) {
      return Response.json({ error: 'Session is already sealed' }, { status: 400 })
    }

    // Get all messages ordered by creation date
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      return Response.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    if (!messages || messages.length === 0) {
      return Response.json({ error: 'Cannot seal empty session' }, { status: 400 })
    }

    // Generate standardized conversation string
    // Format: "user: mensaje1 | assistant: mensaje2 | user: mensaje3 ..."
    const conversationString = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join(' | ')

    // Generate SHA-256 hash of the entire conversation
    const sessionHash = await generateHash(conversationString)

    // Register hash in Arkiv Network
    const arkivEntity = await createArkivEntity({
      type: 'ClinicalSession',
      attributes: {
        chatHash: sessionHash,
        verifiedUser: user.id,
        sessionId: sessionId,
        messageCount: messages.length,
        timestamp: Date.now(),
        patientHash: session.patient_hash,
      },
    })

    // Update session: mark as sealed
    const closedAt = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        is_active: false,
        closed_at: closedAt,
        session_hash: sessionHash,
        arkiv_entity_id: arkivEntity.entityId,
        updated_at: closedAt,
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Error sealing session:', updateError)
      return Response.json({ error: 'Failed to seal session' }, { status: 500 })
    }

    // Log to audit
    await supabase.from('audit_logs').insert({
      action: 'session_sealed',
      actor_id: user.id,
      resource_type: 'session',
      resource_id: sessionId,
      details: {
        sessionHash,
        arkivEntityId: arkivEntity.entityId,
        messageCount: messages.length,
        closedAt,
      },
    })

    return Response.json({
      success: true,
      sessionId,
      sessionHash,
      arkivEntityId: arkivEntity.entityId,
      messageCount: messages.length,
      closedAt,
    })
  } catch (error) {
    console.error('Seal API error:', error)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
