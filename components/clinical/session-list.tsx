'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Session } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  MessageSquare,
  Search,
  Eye,
} from 'lucide-react'

interface SessionWithCounts extends Session {
  messages: { count: number }[]
  decisions: { count: number }[]
}

interface SessionListProps {
  sessions: SessionWithCounts[]
  userId: string
}

export function SessionList({ sessions, userId }: SessionListProps) {
  const [search, setSearch] = useState('')

  const filteredSessions = sessions.filter(
    (session) =>
      session.title?.toLowerCase().includes(search.toLowerCase()) ||
      session.summary?.toLowerCase().includes(search.toLowerCase()) ||
      session.id.toLowerCase().includes(search.toLowerCase())
  )

  if (sessions.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aún no hay consultas</h3>
          <p className="text-muted-foreground text-center mb-4">
            Inicia tu primera sesión clínica con IA para verla aquí.
          </p>
          <Button asChild>
            <Link href="/dashboard">Iniciar Nueva Sesión</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar consultas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="secondary">{sessions.length} consultas</Badge>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className="border border-border/80 rounded-lg p-3.5 hover:border-border hover:shadow-sm hover:bg-muted/10 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                  {/* Session Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start sm:items-center gap-2.5 flex-col sm:flex-row">
                      <div className="font-semibold text-sm text-foreground" title={session.title || 'Consulta'}>
                        {session.title || 'Consulta sin título'}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs border shrink-0 ${
                          session.is_active
                            ? 'bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400'
                            : 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400'
                        }`}
                      >
                        {session.is_active ? 'Activa' : 'Sellada'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed italic line-clamp-2">
                      {session.summary || 'Resumen no disponible. Se generará al finalizar la conversación.'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
                      <span className="font-mono bg-muted/60 px-1 rounded text-[10px]">#{session.id.slice(0, 8)}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(session.created_at), { addSuffix: true, locale: es })}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center justify-end">
                    <Button asChild variant="outline" size="sm" className="h-8">
                      <Link href={`/dashboard/session/${session.id}`}>
                        <Eye className="w-4 h-4 mr-1.5" />
                        Ver
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

