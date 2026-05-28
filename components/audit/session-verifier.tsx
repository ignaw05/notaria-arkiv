'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { verifyHashChain } from '@/lib/crypto'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Shield,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Hash,
  Clock,
  User,
  Building,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'

interface VerificationResult {
  isValid: boolean
  brokenAt?: number
  details: string
}

interface SessionData {
  id: string
  title: string | null
  patient_hash: string
  created_at: string
  closed_at: string | null
  is_active: boolean
  session_hash: string | null
  profiles: {
    full_name: string | null
    email: string | null
    institution: string | null
  } | null
}

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
  const [session, setSession] = useState<SessionData | null>(null)
  const [messages, setMessages] = useState<MessageData[]>([])
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)

  const loadAndVerifySession = async () => {
    if (!sessionId.trim()) {
      toast.error('Please enter a session ID')
      return
    }

    setIsLoading(true)
    setVerificationResult(null)
    setSession(null)
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

      setSession(sessionData)

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId.trim())
        .order('created_at', { ascending: true })

      if (messagesError) {
        throw messagesError
      }

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

      setVerificationResult(result)

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

      {/* Verification Result */}
      {verificationResult && (
        <Alert variant={verificationResult.isValid ? 'default' : 'destructive'}>
          {verificationResult.isValid ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {verificationResult.isValid ? 'Integrity Verified' : 'Integrity Violation Detected'}
          </AlertTitle>
          <AlertDescription>{verificationResult.details}</AlertDescription>
        </Alert>
      )}

      {/* Session Details */}
      {session && (
        <Card>
          <CardHeader>
            <CardTitle>{session.title || 'Untitled Session'}</CardTitle>
            <CardDescription>Session details and metadata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Doctor
                </p>
                <p className="text-sm font-medium">
                  {session.profiles?.full_name || 'Unknown'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  Institution
                </p>
                <p className="text-sm font-medium">
                  {session.profiles?.institution || '-'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Status
                </p>
                {session.is_active ? (
                  <Badge variant="outline" className="text-amber-600">Active</Badge>
                ) : (
                  <Badge variant="outline" className="text-green-600">Sealed</Badge>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Patient Hash
                </p>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  {session.patient_hash}
                </code>
              </div>
            </div>

            {session.session_hash && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  Session Hash
                </p>
                <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                  {session.session_hash}
                </code>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Message Chain */}
      {messages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Message Chain ({messages.length} messages)</CardTitle>
            <CardDescription>
              Complete audit trail with cryptographic hashes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={message.id}>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={message.role === 'user' ? 'default' : 'secondary'}>
                            {message.role}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.created_at).toLocaleString()}
                          </span>
                          {verificationResult?.brokenAt === index && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Integrity Broken
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded p-3">
                          {message.content.slice(0, 500)}
                          {message.content.length > 500 && '...'}
                        </p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            <span>Hash: </span>
                            <code className="bg-muted px-1 rounded">
                              {message.hash.slice(0, 24)}...
                            </code>
                          </div>
                          {message.previous_hash && (
                            <div className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              <span>Previous: </span>
                              <code className="bg-muted px-1 rounded">
                                {message.previous_hash.slice(0, 24)}...
                              </code>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {index < messages.length - 1 && (
                      <Separator className="my-4 ml-12" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
