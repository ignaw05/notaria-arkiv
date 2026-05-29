import { createClient } from '@/lib/supabase/server'
import { generateHash, verifyHashChain } from '@/lib/crypto'
import { verifySessionOnArkiv, isArkivConfigured, getArkivExplorerUrl, getArkivTxUrl, findArkivEntityKeyBySessionId } from '@/lib/arkiv'
import { NextRequest } from 'next/server'
import type { AuditResult } from '@/lib/types'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params

    if (!sessionId) {
      return Response.json({ error: 'sessionId es requerido' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Get session with patient info
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*, patients(id, full_name)')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return Response.json({ error: 'Sesion no encontrada' }, { status: 404 })
    }

    // Check authorization: owner or auditor/admin
    const isOwner = session.doctor_id === user.id
    const isAuditor = profile?.role && ['auditor', 'compliance_officer', 'admin'].includes(profile.role)

    if (!isOwner && !isAuditor) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get all messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      return Response.json({ error: 'Error al obtener mensajes' }, { status: 500 })
    }

    // If session is not sealed, return current state without verification
    if (session.is_active) {
      return Response.json({
        valid: null,
        status: 'active',
        message: 'La sesion esta activa y no ha sido sellada',
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

    // Step 2: Get the immutable hash from Arkiv Network
    let arkivVerified = false
    let arkivStoredHash: string | null = null
    let arkivTimestamp: number | null = null
    let arkivBlockNumber: number | null = null
    let resolvedEntityId = session.arkiv_entity_id
    let usedArkivQuery = false
    
    if (isArkivConfigured()) {
      try {
        // Query Arkiv Network using arkiv_query
        const queriedKey = await findArkivEntityKeyBySessionId(sessionId)
        if (queriedKey) {
          resolvedEntityId = queriedKey
          usedArkivQuery = true
          console.log('[Arkiv] Entity key successfully queried and resolved via arkiv_query:', queriedKey)
        } else {
          console.log('[Arkiv] Entity key not found via arkiv_query, falling back to database value')
        }
      } catch (queryError) {
        console.error('[Arkiv] Error performing arkiv_query:', queryError)
      }
    }

    if (resolvedEntityId && isArkivConfigured() && !resolvedEntityId.startsWith('local_')) {
      try {
        const arkivResult = await verifySessionOnArkiv(resolvedEntityId, reconstructedHash)
        arkivVerified = arkivResult.valid
        arkivStoredHash = arkivResult.storedHash
        arkivTimestamp = arkivResult.timestamp
        arkivBlockNumber = arkivResult.blockNumber || null
      } catch (arkivError) {
        console.error('[Arkiv] Error verifying session:', arkivError)
      }
    }

    // Step 3: Compare hashes (use local stored hash if Arkiv not available)
    const storedHash = session.session_hash
    const hashesMatch = reconstructedHash === storedHash

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

    // Determine overall validity
    // El hash de sesion es la fuente de verdad principal
    const isValid = hashesMatch
    const wasManipulated = !hashesMatch

    // Build audit result
    const auditResult: AuditResult = {
      valid: isValid,
      wasManipulated,
      sessionId,
      hashes: {
        reconstructed: reconstructedHash,
        stored: storedHash || '',
        match: hashesMatch,
      },
      arkiv: {
        configured: isArkivConfigured(),
        verified: arkivVerified,
        entityKey: resolvedEntityId,
        storedHash: arkivStoredHash,
        timestamp: arkivTimestamp,
        blockNumber: arkivBlockNumber,
        explorerUrl: resolvedEntityId && !resolvedEntityId.startsWith('local_')
          ? getArkivExplorerUrl(resolvedEntityId)
          : null,
        usedArkivQuery,
      },
    }

    // Log verification attempt
    await supabase.from('audit_logs').insert({
      action: 'session_audit_verified',
      actor_id: user.id,
      resource_type: 'session',
      resource_id: sessionId,
      details: {
        isValid,
        wasManipulated,
        chainValid: chainVerification.isValid,
        arkivVerified,
        reconstructedHash,
        storedHash,
        arkivEntityId: resolvedEntityId,
        usedArkivQuery,
      },
    })

    // Store verification result
    await supabase.from('integrity_verifications').insert({
      session_id: sessionId,
      verified_by: user.id,
      is_valid: isValid,
      verification_details: {
        sessionHashValid: hashesMatch,
        chainValid: chainVerification.isValid,
        chainDetails: chainVerification.details,
        brokenAt: chainVerification.brokenAt,
        arkivVerified,
        arkivStoredHash,
        arkivTimestamp,
        arkivBlockNumber,
        reconstructedHash,
        storedHash,
        wasManipulated,
        verifiedAt: new Date().toISOString(),
      },
    })

    return Response.json({
      valid: isValid,
      wasManipulated,
      sessionId,
      status: 'sealed',
      auditResult,
      verification: {
        sessionHashValid: hashesMatch,
        chainValid: chainVerification.isValid,
        chainDetails: chainVerification.details,
        brokenAt: chainVerification.brokenAt,
      },
      hashes: {
        reconstructed: reconstructedHash,
        stored: storedHash,
        match: hashesMatch,
      },
      arkiv: {
        configured: isArkivConfigured(),
        verified: arkivVerified,
        entityKey: resolvedEntityId,
        storedHash: arkivStoredHash,
        timestamp: arkivTimestamp,
        blockNumber: arkivBlockNumber,
        explorerUrl: resolvedEntityId && !resolvedEntityId.startsWith('local_')
          ? getArkivExplorerUrl(resolvedEntityId)
          : null,
        usedArkivQuery,
      },
      session: {
        id: sessionId,
        title: session.title,
        patientId: session.patient_id,
        patientName: session.patients?.full_name,
        sealedAt: session.closed_at,
      },
      messages: messages || [],
      messageCount: messages?.length || 0,
    })
  } catch (error) {
    console.error('Audit API error:', error)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
