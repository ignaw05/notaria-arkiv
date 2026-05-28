'use client'

import { useState, useRef, useEffect, use } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { 
  ArrowLeft, Send, Shield, ShieldCheck, ShieldX, ShieldAlert, 
  Lock, Clock, User, Bot, AlertTriangle, CheckCircle, XCircle,
  FileText, Hash, Calendar
} from 'lucide-react'
import { AuditResult } from '@/components/audit/audit-result'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  hash: string
  previous_hash: string | null
  risk_level: 'low' | 'medium' | 'high' | 'critical' | null
  confidence_score: number | null
  created_at: string
}

interface Session {
  id: string
  title: string
  patient_id: string | null
  is_active: boolean
  session_hash: string | null
  arkiv_entity_id: string | null
  started_at: string
  closed_at: string | null
  patients?: {
    id: string
    full_name: string
    date_of_birth: string
  }
}

interface AuditResult {
  valid: boolean
  wasManipulated: boolean
  verification: {
    sessionHashValid: boolean
    chainValid: boolean
    brokenAt?: string
  }
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

const fetcher = (url: string) => fetch(url).then(res => res.json())

function getRiskColor(level: string | null) {
  const colors: Record<string, string> = {
    low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }
  return colors[level || 'low'] || colors.low
}

function getRiskLabel(level: string | null) {
  const labels: Record<string, string> = {
    low: 'Bajo',
    medium: 'Medio',
    high: 'Alto',
    critical: 'Critico',
  }
  return labels[level || 'low'] || 'Bajo'
}

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: sessionData, error: sessionError, isLoading: sessionLoading, mutate: mutateSession } = 
    useSWR<{ sessions: Session[] }>('/api/session', fetcher)
  
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isSealing, setIsSealing] = useState(false)
  const [isAuditing, setIsAuditing] = useState(false)
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null)
  const [sealResult, setSealResult] = useState<{
    sessionHash: string
    arkivEntityKey: string | null
    arkivTxHash: string | null
    arkivExplorerUrl: string | null
    arkivTxUrl: string | null
    arkivConfigured: boolean
  } | null>(null)
  const [showSealDialog, setShowSealDialog] = useState(false)
  const [showSealResultDialog, setShowSealResultDialog] = useState(false)
  const [showAuditDialog, setShowAuditDialog] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const session = sessionData?.sessions?.find(s => s.id === id)

  // Load messages on mount
  useEffect(() => {
    async function loadMessages() {
      try {
        const res = await fetch(`/api/session/${id}/audit`)
        const data = await res.json()
        if (data.messages) {
          setMessages(data.messages)
        }
      } catch (error) {
        console.error('Error loading messages:', error)
      }
    }
    loadMessages()
  }, [id])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isSending || !session?.is_active) return

    const messageContent = input.trim()
    setInput('')
    
    // Agregar mensaje del usuario inmediatamente (optimistic UI)
    const tempUserMessageId = `temp-user-${Date.now()}`
    const tempAiMessageId = `temp-ai-${Date.now()}`
    
    setMessages(prev => [
      ...prev,
      {
        id: tempUserMessageId,
        role: 'user',
        content: messageContent,
        hash: '',
        previous_hash: prev.length > 0 ? prev[prev.length - 1].hash : null,
        risk_level: null,
        confidence_score: null,
        created_at: new Date().toISOString(),
      },
    ])

    setIsSending(true)
    try {
      const res = await fetch('/api/session/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id, prompt: messageContent }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Error al enviar mensaje')
      }

      const data = await res.json()
      
      // Reemplazar mensaje temporal con los reales
      setMessages(prev => {
        // Quitar el mensaje temporal del usuario
        const withoutTemp = prev.filter(m => m.id !== tempUserMessageId)
        return [
          ...withoutTemp,
          {
            id: data.userMessage.id,
            role: 'user',
            content: data.userMessage.content,
            hash: data.userMessage.hash,
            previous_hash: withoutTemp.length > 0 ? withoutTemp[withoutTemp.length - 1].hash : null,
            risk_level: null,
            confidence_score: null,
            created_at: data.userMessage.timestamp,
          },
          {
            id: data.aiMessage.id,
            role: 'assistant',
            content: data.aiMessage.content,
            hash: data.aiMessage.hash,
            previous_hash: data.userMessage.hash,
            risk_level: data.aiMessage.riskLevel,
            confidence_score: data.aiMessage.confidenceScore,
            created_at: data.aiMessage.timestamp,
          },
        ]
      })
    } catch (error) {
      // En caso de error, quitar el mensaje temporal
      setMessages(prev => prev.filter(m => m.id !== tempUserMessageId))
      toast.error(error instanceof Error ? error.message : 'Error al enviar mensaje')
    } finally {
      setIsSending(false)
    }
  }

  const handleSeal = async () => {
    setIsSealing(true)
    try {
      const res = await fetch('/api/session/seal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Error al sellar sesion')
      }

      const data = await res.json()
      
      // Store seal result for popup
      setSealResult({
        sessionHash: data.sessionHash,
        arkivEntityKey: data.arkivEntityKey,
        arkivTxHash: data.arkivTxHash,
        arkivExplorerUrl: data.arkivExplorerUrl,
        arkivTxUrl: data.arkivTxUrl,
        arkivConfigured: data.arkivConfigured,
      })
      
      setShowSealDialog(false)
      setShowSealResultDialog(true)
      mutateSession()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al sellar sesion')
    } finally {
      setIsSealing(false)
    }
  }

  const handleAudit = async () => {
    setIsAuditing(true)
    setAuditResult(null)
    try {
      const res = await fetch(`/api/session/${id}/audit`)
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Error al auditar sesion')
      }

      const data = await res.json()
      setAuditResult(data)
      setShowAuditDialog(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al auditar sesion')
    } finally {
      setIsAuditing(false)
    }
  }

  if (sessionLoading) {
    return (
      <div className="flex flex-col h-full p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    )
  }

  if (sessionError || !session) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-lg font-medium">Sesion no encontrada</p>
            <Link href="/dashboard/patients">
              <Button className="mt-4">Volver a Pacientes</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={session.patient_id ? `/dashboard/patients/${session.patient_id}` : '/dashboard/patients'}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">{session.title}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {session.patients && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {session.patients.full_name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(parseISO(session.started_at), 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {session.is_active ? (
              <>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <Clock className="h-3 w-3 mr-1" />
                  Activa
                </Badge>
                <Button 
                  variant="outline" 
                  onClick={() => setShowSealDialog(true)}
                  disabled={messages.length === 0}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Sellar
                </Button>
              </>
            ) : (
              <>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Sellada
                </Badge>
                <Button onClick={handleAudit} disabled={isAuditing}>
                  <Shield className="h-4 w-4 mr-2" />
                  {isAuditing ? 'Auditando...' : 'Auditar'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Inicia la conversacion con el asistente clinico</p>
              <p className="text-sm mt-2">
                La IA tiene acceso al historial medico del paciente para dar recomendaciones contextualizadas.
              </p>
            </div>
          ) : (
            <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg p-4',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <div className={cn(
                    'flex items-center gap-2 mt-2 text-xs',
                    message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  )}>
                    <span>{format(parseISO(message.created_at), 'HH:mm')}</span>
                    {message.role === 'assistant' && message.risk_level && (
                      <Badge className={getRiskColor(message.risk_level)} variant="secondary">
                        {getRiskLabel(message.risk_level)}
                      </Badge>
                    )}
                    {message.role === 'assistant' && message.confidence_score && (
                      <span>Confianza: {Math.round(message.confidence_score * 100)}%</span>
                    )}
                    <span className="font-mono text-[10px] opacity-70" title={message.hash}>
                      #{message.hash.slice(0, 8)}
                    </span>
                  </div>
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            
            {/* Typing indicator */}
            {isSending && (
              <div className="flex items-start gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      {session.is_active && (
        <div className="border-t p-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu consulta clinica..."
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              disabled={isSending}
            />
            <Button onClick={handleSend} disabled={isSending || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Seal Confirmation Dialog */}
      <Dialog open={showSealDialog} onOpenChange={setShowSealDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Sellar Conversacion
            </DialogTitle>
            <DialogDescription>
              Al sellar la conversacion, se generara un hash criptografico de todos los mensajes
              que se registrara en Arkiv Network para garantizar su integridad.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Accion irreversible</AlertTitle>
            <AlertDescription>
              Una vez sellada, no podras agregar mas mensajes a esta conversacion.
              El hash quedara registrado de forma inmutable.
            </AlertDescription>
          </Alert>
          <div className="text-sm text-muted-foreground">
            <p><strong>Mensajes:</strong> {messages.length}</p>
            <p><strong>Paciente:</strong> {session.patients?.full_name || 'N/A'}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSealDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSeal} disabled={isSealing}>
              {isSealing ? 'Sellando...' : 'Confirmar Sellado'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seal Result Dialog */}
      <Dialog open={showSealResultDialog} onOpenChange={setShowSealResultDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              Sesion Sellada Exitosamente
            </DialogTitle>
            <DialogDescription>
              La conversacion ha sido sellada y su hash ha sido registrado de forma inmutable.
            </DialogDescription>
          </DialogHeader>
          
          {sealResult && (
            <div className="space-y-4">
              {/* Session Hash */}
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Hash de la Sesion
                </p>
                <code className="block bg-muted p-3 rounded text-xs break-all font-mono border">
                  {sealResult.sessionHash}
                </code>
              </div>

              {/* Arkiv Info */}
              {sealResult.arkivConfigured && sealResult.arkivEntityKey && !sealResult.arkivEntityKey.startsWith('local_') ? (
                <div className="space-y-3">
                  <Separator />
                  <div className="flex items-center gap-2 text-green-600">
                    <Shield className="h-4 w-4" />
                    <span className="font-medium">Registrado en Arkiv Network</span>
                  </div>
                  
                  {/* Entity Key */}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Entity Key:</p>
                    <code className="block bg-muted p-2 rounded text-xs break-all font-mono">
                      {sealResult.arkivEntityKey}
                    </code>
                  </div>

                  {/* Transaction Hash */}
                  {sealResult.arkivTxHash && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Transaction Hash:</p>
                      <code className="block bg-muted p-2 rounded text-xs break-all font-mono">
                        {sealResult.arkivTxHash}
                      </code>
                    </div>
                  )}

                  {/* Explorer Links */}
                  <div className="flex gap-2 pt-2">
                    {sealResult.arkivExplorerUrl && (
                      <Button variant="outline" size="sm" asChild className="flex-1">
                        <a href={sealResult.arkivExplorerUrl} target="_blank" rel="noopener noreferrer">
                          Ver Entity en Explorer
                        </a>
                      </Button>
                    )}
                    {sealResult.arkivTxUrl && (
                      <Button variant="outline" size="sm" asChild className="flex-1">
                        <a href={sealResult.arkivTxUrl} target="_blank" rel="noopener noreferrer">
                          Ver Transaccion
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Almacenamiento Local</AlertTitle>
                  <AlertDescription>
                    El hash se guardo localmente. Configura ARKIV_PRIVATE_KEY para registrar en blockchain.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowSealResultDialog(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Result Dialog */}
      <Dialog open={showAuditDialog} onOpenChange={setShowAuditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {auditResult?.wasManipulated ? (
                <>
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                  ⚠️ CONVERSACIÓN MANIPULADA
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                  ✓ Conversación Válida
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {auditResult && (
            <AuditResult result={auditResult} />
          )}

          <DialogFooter>
            <Button onClick={() => setShowAuditDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
