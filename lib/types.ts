// Database enums
export type UserRole = 'doctor' | 'auditor' | 'compliance_officer' | 'admin'
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical'
export type MessageRole = 'user' | 'assistant' | 'system'

// Database models
export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  role: UserRole
  institution: string | null
  specialty: string | null
  license_number: string | null
  created_at: string
  updated_at: string
}

export interface Patient {
  id: string
  doctor_id: string
  full_name: string
  date_of_birth: string
  identifier: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MedicalHistoryEntry {
  id: string
  patient_id: string
  entry_date: string
  description: string
  category: 'diagnosis' | 'treatment' | 'surgery' | 'allergy' | 'medication' | 'other' | null
  created_at: string
}

export interface Session {
  id: string
  doctor_id: string
  patient_id: string | null
  patient_hash: string | null
  title: string | null
  started_at: string
  closed_at: string | null
  is_active: boolean
  session_hash: string | null
  arkiv_entity_id: string | null
  summary: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  session_id: string
  role: MessageRole
  content: string
  hash: string
  previous_hash: string | null
  model: string | null
  tokens_used: number | null
  confidence_score: number | null
  risk_level: SeverityLevel | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface Decision {
  id: string
  session_id: string
  doctor_id: string
  severity: SeverityLevel
  final_decision: string
  ai_recommendation: string | null
  rationale: string | null
  decision_hash: string
  arkiv_entity_id: string | null
  signed_at: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  action: string
  actor_id: string | null
  resource_type: string | null
  resource_id: string | null
  details: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface IntegrityVerification {
  id: string
  session_id: string | null
  verified_by: string | null
  is_valid: boolean
  verification_details: Record<string, unknown>
  verified_at: string
}

// Extended types for UI
export interface SessionWithMessages extends Session {
  messages: Message[]
  decisions: Decision[]
  patient?: Patient
}

export interface PatientWithHistory extends Patient {
  medical_history: MedicalHistoryEntry[]
  sessions?: Session[]
}

export interface MessageWithHash extends Message {
  is_valid?: boolean
}

// Chat UI types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  hash?: string
  riskLevel?: SeverityLevel
  confidenceScore?: number
}

// Audit types
export interface AuditResult {
  valid: boolean
  wasManipulated: boolean
  sessionId: string
  hashes: {
    reconstructed: string
    stored: string
    match: boolean
  }
  arkiv: {
    configured: boolean
    verified: boolean
    entityKey: string | null
    storedHash: string | null
    timestamp: number | null
    blockNumber: number | null
    explorerUrl: string | null
  }
}
