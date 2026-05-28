import { createPublicClient, createWalletClient, http } from '@arkiv-network/sdk'
import { privateKeyToAccount } from '@arkiv-network/sdk/accounts'
import { braga } from '@arkiv-network/sdk/chains'
import { jsonToPayload } from '@arkiv-network/sdk/utils'

// Public client for read operations (safe for frontend)
export const arkivPublicClient = createPublicClient({
  chain: braga,
  transport: http(),
})

// Wallet client for write operations (requires ARKIV_PRIVATE_KEY env var)
export function getArkivWalletClient() {
  const privateKey = process.env.ARKIV_PRIVATE_KEY
  if (!privateKey) {
    throw new Error('ARKIV_PRIVATE_KEY environment variable is not set')
  }
  
  return createWalletClient({
    chain: braga,
    transport: http(),
    account: privateKeyToAccount(privateKey as `0x${string}`),
  })
}

// Types for Arkiv entities
export interface ArkivSessionPayload {
  type: 'clinical_session'
  sessionId: string
  hash: string
  doctorId: string
  patientId: string
  messageCount: number
  sealedAt: string
}

export interface ArkivVerificationResult {
  valid: boolean
  entityKey: string
  storedHash: string
  currentHash: string
  timestamp: number
  blockNumber?: number
  txHash?: string
}

/**
 * Register a session hash on Arkiv Network using createEntity
 * Returns the entity key for future verification
 */
export async function registerSessionOnArkiv(
  sessionId: string,
  sessionHash: string,
  metadata: {
    doctorId: string
    patientId: string
    messageCount: number
    sealedAt: string
  }
): Promise<{ entityKey: string; txHash: string }> {
  const walletClient = getArkivWalletClient()
  
  // Create the payload for the entity
  const payload: ArkivSessionPayload = {
    type: 'clinical_session',
    sessionId,
    hash: sessionHash,
    doctorId: metadata.doctorId,
    patientId: metadata.patientId,
    messageCount: metadata.messageCount,
    sealedAt: metadata.sealedAt,
  }
  
  // Create entity on Arkiv Network
  const { entityKey, txHash } = await walletClient.createEntity({
    payload: jsonToPayload(payload),
    contentType: 'application/json',
    attributes: [
      { key: 'type', value: 'clinical_session' },
      { key: 'sessionId', value: sessionId },
      { key: 'hash', value: sessionHash },
      { key: 'app', value: 'notaria' },
    ],
    expiresIn: 31536000, // 1 year in seconds
  })
  
  return { entityKey, txHash }
}

/**
 * Verify a session hash against Arkiv Network
 * Fetches the entity and compares the stored hash with current hash
 */
export async function verifySessionOnArkiv(
  entityKey: string,
  currentHash: string
): Promise<ArkivVerificationResult> {
  try {
    // Get entity from Arkiv Network
    const entity = await arkivPublicClient.getEntity(entityKey as `0x${string}`)
    
    if (!entity) {
      return {
        valid: false,
        entityKey,
        storedHash: '',
        currentHash,
        timestamp: 0,
      }
    }
    
    // Parse the stored JSON payload
    const storedData = entity.toJson() as ArkivSessionPayload
    
    return {
      valid: storedData.hash === currentHash,
      entityKey,
      storedHash: storedData.hash,
      currentHash,
      timestamp: Date.now(), // Entity doesn't expose timestamp directly
      blockNumber: undefined,
    }
  } catch (error) {
    console.error('[Arkiv] Verification error:', error)
    return {
      valid: false,
      entityKey,
      storedHash: '',
      currentHash,
      timestamp: 0,
    }
  }
}

/**
 * Query all sessions for a specific app (NotarIA)
 */
export async function queryArkivSessions(): Promise<string[]> {
  // Using JSON-RPC query to find all NotarIA sessions
  const rpcUrl = 'https://braga.hoodi.arkiv.network/rpc'
  
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'arkiv_query',
        params: [
          'app = "notaria" && type = "clinical_session"',
          { resultsPerPage: '0x64' }, // 100 results
        ],
      }),
    })
    
    const data = await response.json()
    return data.result?.entities?.map((e: { key: string }) => e.key) || []
  } catch (error) {
    console.error('[Arkiv] Query error:', error)
    return []
  }
}

/**
 * Check if Arkiv is configured with a private key
 */
export function isArkivConfigured(): boolean {
  return !!process.env.ARKIV_PRIVATE_KEY
}

/**
 * Get Arkiv explorer URL for an entity
 */
export function getArkivExplorerUrl(entityKey: string): string {
  return `https://data.arkiv.network/entity/${entityKey}`
}

/**
 * Get Arkiv transaction explorer URL
 */
export function getArkivTxUrl(txHash: string): string {
  return `https://explorer.braga.hoodi.arkiv.network/tx/${txHash}`
}
