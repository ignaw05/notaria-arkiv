'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { verifyHashChain } from '@/lib/crypto'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, Search, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AuditResultDialog } from './audit-result-dialog'

interface MessageData {
  id: string
  role: string
  content: string
  hash: string
  previous_hash: string | null
  created_at: string
  risk_level: string | null
  confidence_score: number | null
}

interface SessionVerifierProps {
  userId: string
}

export function SessionVerifier({ userId }: SessionVerifierProps) {
  const [sessionId, setSessionId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<MessageData[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [auditResult, setAuditResult] = useState<{
    valid: boolean
    wasManipulated: boolean
    sessionId: string
    hashes: { reconstructed: string; stored: string; match: boolean }
    arkiv: {
      configured: boolean
      verified: boolean
      entityKey: string | null
      storedHash: string | null
      timestamp: number | null
      blockNumber: number | null
      explorerUrl: string | null
    }
  } | null>(null)

  const loadAndVerifySession = async () => {
    if (!sessionId.trim()) {
      toast.error('Please enter a session ID')
      return
    }

    setIsLoading(true)
    setAuditResult(null)
    setMessages([])

    try {
      const supabase = createClient()

      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select(`
          *,
          profiles:doctor_id(full_name, email, institution)
        `)
        .eq('id', sessionId.trim())
        .single()

      if (sessionError || !sessionData) {
        toast.error('Session not found')
        setIsLoading(false)
        return
      }

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId.trim())
        .order('created_at', { ascending: true })

      if (messagesError) throw messagesError

      setMessages(messagesData || [])

      // Verify hash chain
      const result = await verifyHashChain(
        (messagesData || []).map((m) => ({
          content: m.content,
          role: m.role,
          created_at: m.created_at,
          hash: m.hash,
          previous_hash: m.previous_hash,
        }))
      )

      // Record verification
      await supabase.from('integrity_verifications').insert({
        session_id: sessionId.trim(),
        verified_by: userId,
        is_valid: result.isValid,
        verification_details: {
          brokenAt: result.brokenAt,
          details: result.details,
          messageCount: messagesData?.length || 0,
          verifiedAt: new Date().toISOString(),
        },
      })

      // Log audit action
      await supabase.from('audit_logs').insert({
        action: 'session_verified',
        actor_id: userId,
        resource_type: 'session',
        resource_id: sessionId.trim(),
        details: {
          isValid: result.isValid,
          messageCount: messagesData?.length || 0,
        },
      })

      // Build AuditResult shape and open dialog
      const reconstructedHash = messagesData?.length
        ? messagesData[messagesData.length - 1].hash
        : ''
      setAuditResult({
        valid: result.isValid,
        wasManipulated: !result.isValid,
        sessionId: sessionId.trim(),
        hashes: {
          reconstructed: reconstructedHash,
          stored: sessionData.session_hash ?? '',
          match: result.isValid,
        },
        arkiv: {
          configured: !!sessionData.arkiv_entity_key && !sessionData.arkiv_entity_key.startsWith('local_'),
          verified: result.isValid,
          entityKey: sessionData.arkiv_entity_key ?? null,
          storedHash: sessionData.arkiv_stored_hash ?? null,
          timestamp: sessionData.arkiv_timestamp ?? null,
          blockNumber: sessionData.arkiv_block_number ?? null,
          explorerUrl: sessionData.arkiv_explorer_url ?? null,
        },
      })
      setDialogOpen(true)

      toast.success(result.isValid ? 'Session verified successfully' : 'Session verification failed')
    } catch (error) {
      console.error('Verification failed:', error)
      toast.error('Failed to verify session')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {auditResult && (
        <AuditResultDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          result={auditResult}
        />
      )}

      {/* Search Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Session Integrity Verification
          </CardTitle>
          <CardDescription>
            Enter a session ID to cryptographically verify the integrity of all messages.
            This confirms that no data has been tampered with since the session was created.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="sessionId">Session ID</Label>
              <Input
                id="sessionId"
                placeholder="Enter session UUID..."
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={loadAndVerifySession} disabled={isLoading || !sessionId.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Verify Session
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
