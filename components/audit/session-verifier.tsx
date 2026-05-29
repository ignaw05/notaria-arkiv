'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, Search, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AuditResultDialog } from './audit-result-dialog'
import type { AuditResult } from '@/lib/types'

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
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null)

  const loadAndVerifySession = async () => {
    if (!sessionId.trim()) {
      toast.error('Por favor, ingresa un ID de sesión válido')
      return
    }

    setIsLoading(true)
    setAuditResult(null)
    setMessages([])

    try {
      // Call the API endpoint which conducts complete cryptographic validation and queries Arkiv Network
      const res = await fetch(`/api/session/${sessionId.trim()}/audit`)
      const data = await res.json()

      if (!res.ok || data.error) {
        toast.error(data.error || 'Error al verificar la sesión')
        setIsLoading(false)
        return
      }

      setMessages(data.messages || [])
      setAuditResult(data.auditResult)
      setDialogOpen(true)

      if (data.valid) {
        toast.success('Sesión verificada correctamente')
      } else {
        toast.error('La verificación de integridad de la sesión falló')
      }
    } catch (error) {
      console.error('Verification failed:', error)
      toast.error('Error al conectar con el servidor para la verificación')
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
