'use client'

import { format } from 'date-fns'
import type { Session, Message, SeverityLevel } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Clock,
  Hash,
  CheckCircle2,
  AlertTriangle,
  Shield,
  User,
  Bot,
} from 'lucide-react'

interface SessionDetailProps {
  session: Session
  messages: Message[]
}

export function SessionDetail({ session, messages }: SessionDetailProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Session Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{session.title || 'Clinical Session'}</CardTitle>
              <CardDescription>Session details and status</CardDescription>
            </div>
            {session.is_active ? (
              <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200 bg-amber-50">
                <Clock className="h-3 w-3" />
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
                <CheckCircle2 className="h-3 w-3" />
                Sealed
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Patient</p>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                {session.patient_hash}
              </code>
            </div>
            <div>
              <p className="text-muted-foreground">Started</p>
              <p className="font-medium">
                {format(new Date(session.started_at), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Messages</p>
              <p className="font-medium">{messages.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Closed</p>
              <p className="font-medium">
                {session.closed_at 
                  ? format(new Date(session.closed_at), 'MMM d, yyyy HH:mm')
                  : '-'
                }
              </p>
            </div>
          </div>

          {session.session_hash && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Shield className="h-3 w-3" />
                Session Hash (Integrity Seal)
              </p>
              <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                {session.session_hash}
              </code>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Conversation Timeline</CardTitle>
          <CardDescription>
            Complete message history with cryptographic hashes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={message.id}>
                  <div className="flex gap-4">
                    <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={message.role === 'user' ? 'default' : 'secondary'}>
                          {message.role === 'user' ? 'Doctor' : 'AI Assistant'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(message.created_at), 'HH:mm:ss')}
                        </span>
                        {message.risk_level && (
                          <RiskBadge level={message.risk_level} />
                        )}
                        {message.confidence_score !== null && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {Math.round(message.confidence_score * 100)}%
                          </Badge>
                        )}
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        <code className="bg-muted px-1 rounded">
                          {message.hash.slice(0, 32)}...
                        </code>
                      </div>
                    </div>
                  </div>
                  {index < messages.length - 1 && (
                    <div className="ml-4 my-2 border-l-2 border-dashed border-muted h-4" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
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
      {level}
    </Badge>
  )
}
