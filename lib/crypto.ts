// Cryptographic hashing utilities for audit chain integrity

/**
 * Generates a SHA-256 hash of the given content
 */
export async function generateHash(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generates a hash for a message including its previous hash for chain integrity
 */
export async function generateMessageHash(
  content: string,
  role: string,
  timestamp: string,
  previousHash: string | null
): Promise<string> {
  const payload = JSON.stringify({
    content,
    role,
    timestamp,
    previousHash: previousHash || 'genesis'
  })
  return generateHash(payload)
}

/**
 * Generates a hash for a clinical decision
 */
export async function generateDecisionHash(
  decision: string,
  aiRecommendation: string | null,
  rationale: string | null,
  severity: string,
  sessionId: string,
  timestamp: string
): Promise<string> {
  const payload = JSON.stringify({
    decision,
    aiRecommendation,
    rationale,
    severity,
    sessionId,
    timestamp
  })
  return generateHash(payload)
}

/**
 * Generates a final session hash from all message hashes
 */
export async function generateSessionHash(messageHashes: string[]): Promise<string> {
  const payload = JSON.stringify({
    hashes: messageHashes,
    count: messageHashes.length,
    finalizedAt: new Date().toISOString()
  })
  return generateHash(payload)
}

/**
 * Verifies the integrity of a hash chain
 */
export async function verifyHashChain(
  messages: Array<{
    content: string
    role: string
    created_at: string
    hash: string
    previous_hash: string | null
  }>
): Promise<{ isValid: boolean; brokenAt?: number; details: string }> {
  if (messages.length === 0) {
    return { isValid: true, details: 'Empty chain is valid' }
  }

  let previousHash: string | null = null

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    
    // Check if previous_hash matches
    if (msg.previous_hash !== previousHash) {
      console.log('[v0] Chain validation - previous_hash mismatch at', i)
      console.log('[v0] Expected:', previousHash, 'Got:', msg.previous_hash)
      return {
        isValid: false,
        brokenAt: i,
        details: `Chain broken at message ${i + 1}: previous_hash mismatch`
      }
    }

    // Verify the message hash
    const computedHash = await generateMessageHash(
      msg.content,
      msg.role,
      msg.created_at,
      previousHash
    )

    if (computedHash !== msg.hash) {
      console.log('[v0] Chain validation - hash mismatch at', i)
      console.log('[v0] Computed:', computedHash)
      console.log('[v0] Stored:', msg.hash)
      console.log('[v0] Message data:', {
        content: msg.content.substring(0, 50),
        role: msg.role,
        created_at: msg.created_at,
        previous_hash: previousHash
      })
      return {
        isValid: false,
        brokenAt: i,
        details: `Chain broken at message ${i + 1}: content hash mismatch (possible tampering)`
      }
    }

    previousHash = msg.hash
  }

  return { isValid: true, details: 'All hashes verified successfully' }
}

/**
 * Generates an anonymized patient identifier
 */
export async function generatePatientHash(
  patientId: string,
  institutionSalt: string
): Promise<string> {
  // Use institution-specific salt for consistent but anonymized IDs
  const payload = `${patientId}:${institutionSalt}:patient`
  const hash = await generateHash(payload)
  // Return truncated hash for readability
  return `PAT-${hash.substring(0, 12).toUpperCase()}`
}
