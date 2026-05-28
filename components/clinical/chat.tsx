'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generateMessageHash, generatePatientHash } from '@/lib/crypto'
import type { Profile, ChatMessage, SeverityLevel } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Send,
  Loader2,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Hash,
  Play,
  StopCircle,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'

interface ClinicalChatProps {
  userId: string
  profile: Profile | null
}

export function ClinicalChat({ userId, profile }: ClinicalChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showStartDialog, setShowStartDialog] = useState(true)
  const [patientId, setPatientId] = useState('')
  const [sessionTitle, setSessionTitle] = useState('')
  const [lastHash, setLastHash] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const startSession = async () => {
    if (!patientId.trim()) {
      toast.error('Please enter a patient identifier')
      return
    }

    try {
      const supabase = createClient()
      const patientHash = await generatePatientHash(patientId, profile?.institution || 'default')

      const { data, error } = await supabase
        .from('sessions')
        .insert({
          doctor_id: userId,
          patient_hash: patientHash,
          title: sessionTitle || `Clinical Session - ${new Date().toLocaleDateString()}`,
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error

      setSessionId(data.id)
      setShowStartDialog(false)
      toast.success('Session started', {
        description: `Patient: ${patientHash}`,
      })

      // Add system message
      const systemMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Clinical session initialized for patient ${patientHash}. I'm ready to assist with clinical decision support. All interactions are recorded with cryptographic integrity for audit purposes.\n\nHow can I help you today?`,
        timestamp: new Date(),
      }
      setMessages([systemMessage])

      // Record the system message
      const timestamp = new Date().toISOString()
      const hash = await generateMessageHash(systemMessage.content, 'assistant', timestamp, null)
      setLastHash(hash)

      await supabase.from('messages').insert({
        session_id: data.id,
        role: 'assistant',
        content: systemMessage.content,
        hash,
        previous_hash: null,
      })
    } catch (error) {
      console.error('Failed to start session:', error)
      toast.error('Failed to start session')
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || !sessionId || isLoading) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const supabase = createClient()
      const timestamp = new Date().toISOString()
      const userHash = await generateMessageHash(userMessage.content, 'user', timestamp, lastHash)

      // Store user message
      await supabase.from('messages').insert({
        session_id: sessionId,
        role: 'user',
        content: userMessage.content,
        hash: userHash,
        previous_hash: lastHash,
      })

      // Call AI API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          sessionId,
        }),
      })

      if (!response.ok) throw new Error('AI response failed')

      const data = await response.json()
      const assistantTimestamp = new Date().toISOString()
      const assistantHash = await generateMessageHash(
        data.content,
        'assistant',
        assistantTimestamp,
        userHash
      )

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        hash: assistantHash,
        riskLevel: data.riskLevel,
        confidenceScore: data.confidenceScore,
      }

      // Store assistant message
      await supabase.from('messages').insert({
        session_id: sessionId,
        role: 'assistant',
        content: data.content,
        hash: assistantHash,
        previous_hash: userHash,
        model: data.model,
        confidence_score: data.confidenceScore,
        risk_level: data.riskLevel,
        metadata: { reasoning: data.reasoning },
      })

      setMessages(prev => [...prev, assistantMessage])
      setLastHash(assistantHash)
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Failed to get AI response')
    } finally {
      setIsLoading(false)
    }
  }

  const endSession = async () => {
    if (!sessionId) return

    try {
      const supabase = createClient()
      await supabase
        .from('sessions')
        .update({
          is_active: false,
          closed_at: new Date().toISOString(),
          session_hash: lastHash,
        })
        .eq('id', sessionId)

      toast.success('Session ended and sealed', {
        description: 'All messages have been cryptographically sealed for audit.',
      })

      // Reset state
      setSessionId(null)
      setMessages([])
      setLastHash(null)
      setShowStartDialog(true)
      setPatientId('')
      setSessionTitle('')
    } catch (error) {
      console.error('Failed to end session:', error)
      toast.error('Failed to end session')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Start Session Dialog */}
      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Start Clinical Session
            </DialogTitle>
            <DialogDescription>
              Enter patient information to begin a new auditable clinical AI session.
              All interactions will be recorded with cryptographic integrity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="patientId">Patient Identifier *</Label>
              <Input
                id="patientId"
                placeholder="MRN or Patient ID"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This will be anonymized using cryptographic hashing
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionTitle">Session Title (optional)</Label>
              <Input
                id="sessionTitle"
                placeholder="e.g., Initial Consultation"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={startSession} disabled={!patientId.trim()}>
              <Play className="mr-2 h-4 w-4" />
              Start Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Chat Interface */}
      <div className="flex flex-col h-full">
        {/* Session Info Bar */}
        {sessionId && (
          <div className="flex items-center justify-between px-6 py-3 bg-muted/50 border-b">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                Active Session
              </Badge>
              <span className="text-sm text-muted-foreground">
                {messages.length} messages recorded
              </span>
            </div>
            <Button variant="destructive" size="sm" onClick={endSession}>
              <StopCircle className="mr-2 h-4 w-4" />
              End & Seal Session
            </Button>
          </div>
        )}

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">AI is thinking...</span>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        {sessionId && (
          <div className="border-t bg-card px-6 py-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-2">
                <Textarea
                  ref={textareaRef}
                  placeholder="Describe the clinical situation or ask a question..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="min-h-[60px] resize-none"
                  rows={2}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="h-auto"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Hash className="h-3 w-3" />
                Messages are cryptographically chained for audit integrity
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <Card className={`max-w-[85%] ${isUser ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
        <CardContent className="p-4">
          <div className="whitespace-pre-wrap text-sm">{message.content}</div>
          
          {/* AI Message Metadata */}
          {!isUser && (message.riskLevel || message.confidenceScore) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
              {message.riskLevel && (
                <RiskBadge level={message.riskLevel} />
              )}
              {message.confidenceScore !== undefined && (
                <Badge variant="outline" className="text-xs gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {Math.round(message.confidenceScore * 100)}% confidence
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function RiskBadge({ level }: { level: SeverityLevel }) {
  const config = {
    low: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
    medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertTriangle },
    high: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertTriangle },
    critical: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle },
  }

  const { color, icon: Icon } = config[level]

  return (
    <Badge variant="outline" className={`text-xs gap-1 ${color}`}>
      <Icon className="h-3 w-3" />
      {level} risk
    </Badge>
  )
}
