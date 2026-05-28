import { createPublicClient, createWalletClient, http } from '@arkiv-network/sdk'
import { privateKeyToAccount } from '@arkiv-network/sdk/accounts'
import { braga } from '@arkiv-network/sdk/chains'

// Public client for read operations
export const publicClient = createPublicClient({
  chain: braga,
  transport: http(),
})

// Wallet client for write operations (requires ARKIV_PRIVATE_KEY env var)
export function getWalletClient() {
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
export interface ArkivEntity {
  id: string
  hash: string
  timestamp: number
  metadata?: Record<string, unknown>
}

export interface ArkivVerificationResult {
  valid: boolean
  entityId: string
  storedHash: string
  currentHash: string
  timestamp: number
  blockNumber?: number
}

/**
 * Register a session hash on Arkiv Network
 * Returns the entity ID for future verification
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
): Promise<{ entityId: string; txHash: string }> {
  const walletClient = getWalletClient()
  
  // Create the data payload
  const payload = {
    type: 'clinical_session',
    sessionId,
    hash: sessionHash,
    metadata,
    timestamp: Date.now(),
  }
  
  // Convert to hex for on-chain storage
  const dataHex = `0x${Buffer.from(JSON.stringify(payload)).toString('hex')}` as `0x${string}`
  
  // Send transaction to Arkiv Network
  const txHash = await walletClient.sendTransaction({
    to: walletClient.account.address, // Self-referential for data anchoring
    data: dataHex,
    value: BigInt(0),
  })
  
  // The entity ID is derived from the transaction hash
  const entityId = `arkiv:${txHash}`
  
  return { entityId, txHash }
}

/**
 * Verify a session hash against Arkiv Network
 * Returns verification result with tampering detection
 */
export async function verifySessionOnArkiv(
  entityId: string,
  currentHash: string
): Promise<ArkivVerificationResult> {
  // Extract transaction hash from entity ID
  const txHash = entityId.replace('arkiv:', '') as `0x${string}`
  
  try {
    // Get transaction from chain
    const tx = await publicClient.getTransaction({ hash: txHash })
    
    if (!tx || !tx.input) {
      return {
        valid: false,
        entityId,
        storedHash: '',
        currentHash,
        timestamp: 0,
      }
    }
    
    // Decode the stored data
    const dataHex = tx.input.slice(2) // Remove 0x prefix
    const dataJson = Buffer.from(dataHex, 'hex').toString('utf8')
    const storedData = JSON.parse(dataJson)
    
    // Get block for timestamp
    const block = await publicClient.getBlock({ blockNumber: tx.blockNumber! })
    
    return {
      valid: storedData.hash === currentHash,
      entityId,
      storedHash: storedData.hash,
      currentHash,
      timestamp: Number(block.timestamp) * 1000,
      blockNumber: Number(tx.blockNumber),
    }
  } catch (error) {
    console.error('[v0] Arkiv verification error:', error)
    return {
      valid: false,
      entityId,
      storedHash: '',
      currentHash,
      timestamp: 0,
    }
  }
}

/**
 * Check if Arkiv is configured
 */
export function isArkivConfigured(): boolean {
  return !!process.env.ARKIV_PRIVATE_KEY
}
