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
  let privateKey = process.env.ARKIV_PRIVATE_KEY
  if (!privateKey) {
    throw new Error('ARKIV_PRIVATE_KEY environment variable is not set')
  }
  
  // Add 0x prefix if not present
  if (!privateKey.startsWith('0x')) {
    privateKey = `0x${privateKey}`
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
  patientEntityKey?: string | null
  messageCount: number
  sealedAt: string
}

export interface ArkivPatientPayload {
  type: 'patient'
  patientId: string
  name: string
}

export interface ArkivVerificationResult {
  valid: boolean
  entityKey: string
  storedHash: string
  currentHash: string
  timestamp: number
  blockNumber?: number
  txHash?: string
  owner?: string
}

/**
 * Register a patient on Arkiv Network using createEntity
 */
export async function registerPatientOnArkiv(
  patientId: string,
  name: string,
  ownerWalletAddress?: string | null
): Promise<{ entityKey: string; txHash: string }> {
  const walletClient = getArkivWalletClient()
  
  const payload: ArkivPatientPayload = {
    type: 'patient',
    patientId,
    name,
  }
  
  const { entityKey, txHash } = await walletClient.createEntity({
    payload: jsonToPayload(payload),
    contentType: 'application/json',
    attributes: [
      { key: 'type', value: 'patient' },
      { key: 'patientId', value: patientId },
      { key: 'app', value: 'notaria' },
    ],
    expiresIn: 315360000, // 10 years in seconds
  })

  let finalTxHash: string = txHash
  if (ownerWalletAddress) {
    try {
      console.log(`[Arkiv] Transferring ownership of patient entity ${entityKey} to ${ownerWalletAddress}`)
      const transferResult = await walletClient.changeOwnership({
        entityKey,
        newOwner: ownerWalletAddress as `0x${string}`
      })
      finalTxHash = transferResult.txHash
      console.log(`[Arkiv] Patient ownership transferred successfully in tx ${finalTxHash}`)
    } catch (transferError) {
      console.error('[Arkiv] Error transferring patient ownership to user wallet:', transferError)
    }
  }
  
  return { entityKey, txHash: finalTxHash }
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
    patientEntityKey?: string | null
    ownerWalletAddress?: string | null
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
    patientEntityKey: metadata.patientEntityKey || null,
    messageCount: metadata.messageCount,
    sealedAt: metadata.sealedAt,
  }
  
  const attributes = [
    { key: 'type', value: 'clinical_session' },
    { key: 'sessionId', value: sessionId },
    { key: 'hash', value: sessionHash },
    { key: 'app', value: 'notaria' },
    { key: 'doctorId', value: metadata.doctorId },
    { key: 'patientId', value: metadata.patientId },
  ]

  if (metadata.patientEntityKey) {
    attributes.push({ key: 'patientEntityKey', value: metadata.patientEntityKey })
  }
  
  // Create entity on Arkiv Network
  const { entityKey, txHash } = await walletClient.createEntity({
    payload: jsonToPayload(payload),
    contentType: 'application/json',
    attributes,
    expiresIn: 157680000, // 5 years in seconds
  })

  let finalTxHash: string = txHash
  if (metadata.ownerWalletAddress) {
    try {
      console.log(`[Arkiv] Transferring ownership of session entity ${entityKey} to ${metadata.ownerWalletAddress}`)
      const transferResult = await walletClient.changeOwnership({
        entityKey,
        newOwner: metadata.ownerWalletAddress as `0x${string}`
      })
      finalTxHash = transferResult.txHash
      console.log(`[Arkiv] Session ownership transferred successfully in tx ${finalTxHash}`)
    } catch (transferError) {
      console.error('[Arkiv] Error transferring session ownership to user wallet:', transferError)
    }
  }
  
  return { entityKey, txHash: finalTxHash }
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
      owner: entity.owner,
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

export interface ArkivEntity<T> {
  key: string
  owner: string
  creator: string
  payload: T
  attributes: Record<string, string>
}

function parseRpcEntity<T>(entity: any): ArkivEntity<T> {
  const hex = entity.value.startsWith('0x') ? entity.value.slice(2) : entity.value
  const jsonStr = Buffer.from(hex, 'hex').toString('utf-8')
  let payload: T
  try {
    payload = JSON.parse(jsonStr)
  } catch (e) {
    payload = {} as T
  }
  
  const attributes: Record<string, string> = {}
  if (entity.stringAttributes) {
    for (const attr of entity.stringAttributes) {
      attributes[attr.key] = attr.value
    }
  }
  
  return {
    key: entity.key,
    owner: entity.owner,
    creator: entity.creator,
    payload,
    attributes,
  }
}

/**
 * Query all sessions for a specific app (NotarIA)
 */
export async function queryArkivSessions(): Promise<string[]> {
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
          { resultsPerPage: '0x64' },
        ],
      }),
    })
    
    const data = await response.json()
    const items = data.result?.data || data.result?.entities || []
    return items.map((e: { key: string }) => e.key)
  } catch (error) {
    console.error('[Arkiv] Query error:', error)
    return []
  }
}

/**
 * Query sessions on Arkiv Network for a specific doctor
 */
export async function queryArkivSessionsByDoctor(doctorId: string): Promise<ArkivEntity<ArkivSessionPayload>[]> {
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
          `app = "notaria" && type = "clinical_session" && doctorId = "${doctorId}"`,
          { resultsPerPage: '0x64' },
        ],
      }),
    })
    
    const data = await response.json()
    const items = data.result?.data || data.result?.entities || []
    return items.map((item: any) => parseRpcEntity<ArkivSessionPayload>(item))
  } catch (error) {
    console.error('[Arkiv] Query sessions by doctor error:', error)
    return []
  }
}

/**
 * Query sessions on Arkiv Network for a specific patient
 */
export async function queryArkivSessionsByPatient(patientId: string): Promise<ArkivEntity<ArkivSessionPayload>[]> {
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
          `app = "notaria" && type = "clinical_session" && patientId = "${patientId}"`,
          { resultsPerPage: '0x64' },
        ],
      }),
    })
    
    const data = await response.json()
    const items = data.result?.data || data.result?.entities || []
    return items.map((item: any) => parseRpcEntity<ArkivSessionPayload>(item))
  } catch (error) {
    console.error('[Arkiv] Query sessions by patient error:', error)
    return []
  }
}

/**
 * Query patients on Arkiv Network
 */
export async function queryArkivPatients(): Promise<ArkivEntity<ArkivPatientPayload>[]> {
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
          'app = "notaria" && type = "patient"',
          { resultsPerPage: '0x64' },
        ],
      }),
    })
    
    const data = await response.json()
    const items = data.result?.data || data.result?.entities || []
    return items.map((item: any) => parseRpcEntity<ArkivPatientPayload>(item))
  } catch (error) {
    console.error('[Arkiv] Query patients error:', error)
    return []
  }
}

/**
 * Check if Arkiv is configured with a private key
 */
export function isArkivConfigured(): boolean {
  const key = process.env.ARKIV_PRIVATE_KEY
  return !!key && key.length >= 64
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

/**
 * Query Arkiv Network to find the entity key for a specific session ID
 */
export async function findArkivEntityKeyBySessionId(sessionId: string): Promise<string | null> {
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
          `app = "notaria" && type = "clinical_session" && sessionId = "${sessionId}"`,
          { resultsPerPage: '0x1' },
        ],
      }),
    })
    
    const data = await response.json()
    const entities = data.result?.data || data.result?.entities
    if (entities && entities.length > 0) {
      return entities[0].key
    }
    return null
  } catch (error) {
    console.error('[Arkiv] Query by sessionId error:', error)
    return null
  }
}
