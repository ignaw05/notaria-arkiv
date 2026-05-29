import { createClient } from '@/lib/supabase/server'
import { generateHash } from '@/lib/crypto'
import { registerSessionOnArkiv, registerPatientOnArkiv, isArkivConfigured, getArkivExplorerUrl, getArkivTxUrl } from '@/lib/arkiv'

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
      .select('*, patients(id, full_name, arkiv_entity_id)')
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
    let arkivEntityKey: string | null = null
    let arkivTxHash: string | null = null

    // Fetch doctor's profile to check if they have a wallet connected
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_address')
      .eq('id', user.id)
      .single()

    // Register on Arkiv Network if configured
    if (isArkivConfigured()) {
      try {
        // Dynamic, on-the-fly registration for existing patients created prior to Web3 implementation
        let patientEntityKey = session.patients?.arkiv_entity_id || null

        if (session.patients && !patientEntityKey) {
          try {
            console.log(`[Arkiv] Patient ${session.patients.id} has no on-chain entity. Registering now...`)
            const patientRegisterResult = await registerPatientOnArkiv(
              session.patients.id,
              session.patients.full_name,
              profile?.wallet_address || null
            )
            patientEntityKey = patientRegisterResult.entityKey
            
            // Persist the resolved patientEntityKey to Supabase
            await supabase
              .from('patients')
              .update({ arkiv_entity_id: patientEntityKey })
              .eq('id', session.patients.id)
              
            console.log(`[Arkiv] Patient dynamically registered: ${patientEntityKey}`)
          } catch (patientRegisterError) {
            console.error('[Arkiv] Error registering patient dynamically:', patientRegisterError)
          }
        }

        const arkivResult = await registerSessionOnArkiv(
          sessionId,
          sessionHash,
          {
            doctorId: user.id,
            patientId: session.patient_id || 'anonymous',
            messageCount: messages.length,
            sealedAt: closedAt,
            patientEntityKey: patientEntityKey,
            ownerWalletAddress: profile?.wallet_address || null,
          }
        )
        arkivEntityKey = arkivResult.entityKey
        arkivTxHash = arkivResult.txHash
        console.log('[Arkiv] Session registered:', arkivEntityKey, arkivTxHash)
      } catch (arkivError) {
        console.error('[Arkiv] Error registering session:', arkivError)
        // Continue without Arkiv - store hash locally at minimum
      }
    } else {
      console.log('[Arkiv] Not configured - storing hash locally only')
      // Generate a local-only entity key for tracking
      arkivEntityKey = `local_${sessionId}_${Date.now()}`
    }

    // Update session: mark as sealed
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        is_active: false,
        closed_at: closedAt,
        session_hash: sessionHash,
        arkiv_entity_id: arkivEntityKey,
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
        arkivEntityKey,
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
      arkivEntityKey,
      arkivTxHash,
      arkivConfigured: isArkivConfigured(),
      arkivExplorerUrl: arkivEntityKey && !arkivEntityKey.startsWith('local_') 
        ? getArkivExplorerUrl(arkivEntityKey) 
        : null,
      arkivTxUrl: arkivTxHash ? getArkivTxUrl(arkivTxHash) : null,
      messageCount: messages.length,
      closedAt,
    })
  } catch (error) {
    console.error('Seal API error:', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
