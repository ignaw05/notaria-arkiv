import { createClient } from '@/lib/supabase/server'
import { generateHash, verifyHashChain } from '@/lib/crypto'
import { NextRequest } from 'next/server'

// Arkiv SDK mock - replace with actual SDK when available
async function getArkivEntity(entityId: string): Promise<{
  entityId: string
  attributes: {
    chatHash: string
    verifiedUser: string
    timestamp: number
  }
} | null> {
  // TODO: Replace with actual Arkiv SDK call
  // const arkiv = new ArkivClient(process.env.ARKIV_API_KEY)
  // return await arkiv.getEntity(entityId)
  
  // Mock implementation - in production this returns the immutable blockchain data
  console.log('[Arkiv] Fetching entity:', entityId)
  return null // Will use stored hash for demo
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params

    if (!sessionId) {
      return Response.json({ error: 'sessionId is required' }, { status: 400 })
    }

    // Verify authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return Response.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check authorization: owner or auditor/admin
    const isOwner = session.doctor_id === user.id
    const isAuditor = profile?.role && ['auditor', 'compliance_officer', 'admin'].includes(profile.role)

    if (!isOwner && !isAuditor) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      return Response.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // If session is not sealed, return current state without verification
    if (session.is_active) {
      return Response.json({
        valid: null,
        status: 'active',
        message: 'Session is still active and not sealed',
        sessionId,
        messages: messages || [],
        messageCount: messages?.length || 0,
      })
    }

    // VERIFICATION PROCESS
    // Step 1: Reconstruct the hash from current database messages
    const conversationString = (messages || [])
      .map((m) => `${m.role}: ${m.content}`)
      .join(' | ')

    const reconstructedHash = await generateHash(conversationString)

    // Step 2: Get the immutable hash from Arkiv (or stored hash for demo)
    let immutableHash: string | null = null
    
    if (session.arkiv_entity_id) {
      const arkivEntity = await getArkivEntity(session.arkiv_entity_id)
      if (arkivEntity) {
        immutableHash = arkivEntity.attributes.chatHash
      }
    }
    
    // Fallback to stored hash if Arkiv not available
    immutableHash = immutableHash || session.session_hash

    // Step 3: Compare hashes
    const isValid = reconstructedHash === immutableHash

    // Step 4: Verify individual message hash chain
    const chainVerification = await verifyHashChain(
      (messages || []).map((m) => ({
        content: m.content,
        role: m.role,
        created_at: m.created_at,
        hash: m.hash,
        previous_hash: m.previous_hash,
      }))
    )

    // Log verification attempt
    await supabase.from('audit_logs').insert({
      action: 'session_audit_verified',
      actor_id: user.id,
      resource_type: 'session',
      resource_id: sessionId,
      details: {
        isValid,
        chainValid: chainVerification.isValid,
        reconstructedHash,
        storedHash: immutableHash,
        arkivEntityId: session.arkiv_entity_id,
      },
    })

    // Store verification result
    await supabase.from('integrity_verifications').insert({
      session_id: sessionId,
      verified_by: user.id,
      is_valid: isValid && chainVerification.isValid,
      verification_details: {
        sessionHashValid: isValid,
        chainValid: chainVerification.isValid,
        chainDetails: chainVerification.details,
        brokenAt: chainVerification.brokenAt,
        reconstructedHash,
        storedHash: immutableHash,
        arkivEntityId: session.arkiv_entity_id,
        verifiedAt: new Date().toISOString(),
      },
    })

    return Response.json({
      valid: isValid && chainVerification.isValid,
      status: 'sealed',
      verification: {
        sessionHashValid: isValid,
        chainValid: chainVerification.isValid,
        chainDetails: chainVerification.details,
        brokenAt: chainVerification.brokenAt,
      },
      hashes: {
        reconstructed: reconstructedHash,
        stored: immutableHash,
        match: isValid,
      },
      sessionId,
      arkivEntityId: session.arkiv_entity_id,
      messages: messages || [],
      messageCount: messages?.length || 0,
      sealedAt: session.closed_at,
    })
  } catch (error) {
    console.error('Audit API error:', error)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
