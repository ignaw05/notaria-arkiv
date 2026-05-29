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
  FileText, Hash, Calendar, CheckCircle2, ExternalLink
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AuditResultDialog } from '@/components/audit/audit-result-dialog'
import type { AuditResult as AuditResultType } from '@/lib/types'

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
    low: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
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
  const [messagesLoading, setMessagesLoading] = useState(true)
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isSealing, setIsSealing] = useState(false)
  const [isAuditing, setIsAuditing] = useState(false)
  const [auditResult, setAuditResult] = useState<AuditResultType | null>(null)
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
  const [doctorName, setDoctorName] = useState('')

  useEffect(() => {
    async function loadDoctor() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single()
          if (profile?.full_name) {
            setDoctorName(profile.full_name)
          }
        }
      } catch (err) {
        console.error('Error fetching doctor profile:', err)
      }
    }
    loadDoctor()
  }, [])

  const session = sessionData?.sessions?.find(s => s.id === id)

  // Load messages on mount
  useEffect(() => {
    async function loadMessages() {
      setMessagesLoading(true)
      try {
        const res = await fetch(`/api/session/${id}/audit`)
        const data = await res.json()
        if (data.messages) {
          setMessages(data.messages)
        }
      } catch (error) {
        console.error('Error loading messages:', error)
      } finally {
        setMessagesLoading(false)
      }
    }
    loadMessages()
  }, [id])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Track message count to trigger summary on page exit
  const messagesCountRef = useRef(0)
  useEffect(() => {
    messagesCountRef.current = messages.length
  }, [messages])

  useEffect(() => {
    return () => {
      if (messagesCountRef.current > 0) {
        fetch(`/api/session/${id}/summary`, {
          method: 'POST',
          keepalive: true,
        }).catch((err) => console.error('Failed to trigger summary on exit:', err))
      }
    }
  }, [id])

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

      // Generate summary on seal
      fetch(`/api/session/${id}/summary`, { method: 'POST' }).catch((err) =>
        console.error('Failed to generate summary on seal:', err)
      )
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
    <div className="flex flex-col h-full bg-slate-50/40 dark:bg-transparent">
      {/* Header */}
      <div className="bg-background border-b px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={session.patient_id ? `/dashboard/patients/${session.patient_id}` : '/dashboard/patients'}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-base font-semibold leading-none">{session.title}</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5">
                <User className="h-3.5 w-3.5" />
                <span>{session.patients?.full_name || 'Paciente sin nombre'}</span>
                <span>•</span>
                <Calendar className="h-3.5 w-3.5" />
                <span>{format(parseISO(session.started_at), 'dd/MM/yyyy HH:mm')}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {session.is_active ? (
              <>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Activa
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowSealDialog(true)}
                  disabled={messages.length === 0}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Sellar
                </Button>
              </>
            ) : (
              <>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Sellada
                </Badge>
                <Button onClick={handleAudit} disabled={isAuditing} size="sm">
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
        <div className="max-w-5xl mx-auto space-y-6">
          {messagesLoading ? (
            <div className="space-y-6 py-4">
              <div className="flex gap-3 justify-start">
                <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                <div className="space-y-2 flex-1 max-w-[65%]">
                  <div className="h-4 bg-muted rounded-md w-1/4" />
                  <div className="bg-muted rounded-lg p-4 h-16 w-full" />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <div className="space-y-2 flex-1 max-w-[50%] flex flex-col items-end">
                  <div className="h-4 bg-muted rounded-md w-1/3" />
                  <div className="bg-muted rounded-lg p-4 h-12 w-full" />
                </div>
                <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
              </div>
              <div className="flex gap-3 justify-start">
                <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                <div className="space-y-2 flex-1 max-w-[75%]">
                  <div className="h-4 bg-muted rounded-md w-1/5" />
                  <div className="bg-muted rounded-lg p-4 h-24 w-full" />
                </div>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Inicia la conversación con el asistente clínico</p>
              <p className="text-sm mt-2">
                La IA tiene acceso al historial médico del paciente para dar recomendaciones contextualizadas.
              </p>
            </div>
          ) : (
            <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary-foreground" />
                    </div>
                  </div>
                )}
                
                <div className={cn('max-w-3xl', message.role === 'user' ? 'flex flex-col items-end' : '')}>
                  <div
                    className={cn(
                      'rounded-lg p-4 leading-relaxed',
                      message.role === 'user'
                        ? 'bg-blue-900 text-white dark:bg-blue-950 border border-blue-800'
                        : 'bg-card border text-foreground'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <div className={cn(
                      'flex items-center gap-2 mt-2.5 text-xs',
                      message.role === 'user' ? 'text-blue-200' : 'text-muted-foreground'
                    )}>
                      <span>{format(parseISO(message.created_at), 'HH:mm')}</span>
                      {message.role === 'assistant' && message.risk_level && (
                        <>
                          <span>•</span>
                          <Badge variant="outline" className={cn('text-[10px] h-4 py-0 px-1 border-destructive/20 hover:bg-transparent', getRiskColor(message.risk_level))}>
                            {getRiskLabel(message.risk_level)}
                          </Badge>
                        </>
                      )}
                      {message.role === 'assistant' && message.confidence_score && (
                        <>
                          <span>•</span>
                          <span>Confianza: {Math.round(message.confidence_score * 100)}%</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="font-mono opacity-80" title={message.hash}>
                        #{message.hash.slice(0, 8)}
                      </span>
                    </div>
                  </div>
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0 ml-3">
                    <div className="w-10 h-10 bg-muted border rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* Typing indicator */}
            {isSending && (
              <div className="flex items-start justify-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary-foreground" />
                  </div>
                </div>
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center gap-1.5 h-5 px-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full" />
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
        <div className="bg-background border-t p-4">
          <div className="max-w-5xl mx-auto flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Escribe tu consulta clínica..."
                rows={1}
                disabled={isSending}
                className="w-full min-h-[48px] max-h-[200px] px-4 py-3 border border-input rounded-lg resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-background text-sm text-foreground leading-relaxed transition-colors shadow-sm"
                style={{ height: 'auto' }}
              />
            </div>
            <Button 
              onClick={handleSend} 
              disabled={isSending || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 h-12 px-4 shrink-0 text-white transition-colors"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Seal Confirmation Dialog */}
      <Dialog open={showSealDialog} onOpenChange={setShowSealDialog}>
        <DialogContent className="max-w-md p-6 gap-6 rounded-xl border border-border shadow-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-foreground">
              <Lock className="h-5 w-5 text-foreground/80" />
              Sellar Conversacion
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Al sellar la conversacion, se generara un hash criptografico de todos los mensajes que se registraran en Arkiv Network para garantizar su integridad.
            </p>

            <div className="flex gap-3 bg-amber-500/[0.04] border border-amber-500/20 rounded-lg p-4 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h5 className="text-sm font-semibold tracking-tight leading-none">Accion irreversible</h5>
                <p className="text-xs opacity-90 leading-relaxed">
                  Una vez sellada, no podras agregar mas mensajes a esta conversacion. El hash quedara registrado de forma inmutable.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-foreground/80 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium w-16">Paciente:</span>
                <span className="font-semibold text-foreground">{session.patients?.full_name || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium w-16">Médico:</span>
                <span className="font-semibold text-foreground">{doctorName || 'Dr. María González'}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-row gap-3 sm:justify-end mt-2">
            <Button variant="outline" onClick={() => setShowSealDialog(false)} className="flex-1 sm:flex-initial h-11 border-border font-medium">
              Cancelar
            </Button>
            <Button onClick={handleSeal} disabled={isSealing} className="flex-1 sm:flex-initial h-11 bg-[#1e3a8a] hover:bg-[#172554] text-white font-medium">
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
              <ShieldCheck className="h-5 w-5 text-blue-600" />
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
                  <div className="flex items-center gap-2 text-blue-600">
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
                  <div className="flex gap-3 pt-2">
                    {sealResult.arkivExplorerUrl && (
                      <Button variant="outline" asChild className="flex-1 h-10 border-border">
                        <a href={sealResult.arkivExplorerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 font-medium">
                          <ExternalLink className="w-4 h-4" />
                          Ver Entity en Explorer
                        </a>
                      </Button>
                    )}
                    {sealResult.arkivTxUrl && (
                      <Button variant="outline" asChild className="flex-1 h-10 border-border">
                        <a href={sealResult.arkivTxUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 font-medium">
                          <ExternalLink className="w-4 h-4" />
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
              
              <Button 
                onClick={() => setShowSealResultDialog(false)} 
                className="w-full bg-[#1e3a8a] hover:bg-[#172554] text-white h-11 font-medium mt-2"
              >
                Entendido
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Audit Result Dialog */}
      {auditResult && (
        <AuditResultDialog
          open={showAuditDialog}
          onOpenChange={setShowAuditDialog}
          result={auditResult}
        />
      )}
    </div>
  )
}
