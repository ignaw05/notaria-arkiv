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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Clock,
  MessageSquare,
  Hash,
  Search,
  Eye,
  CheckCircle2,
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Consulta</TableHead>
              <TableHead className="max-w-[400px]">Resumen por IA</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell>
                  <div className="font-medium">
                    {session.title || 'Consulta sin título'}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {session.id.slice(0, 8)}...
                  </div>
                </TableCell>
                <TableCell className="max-w-[400px]">
                  <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed italic">
                    {session.summary || 'Resumen no disponible. Se generará al finalizar la conversación.'}
                  </p>
                </TableCell>
                <TableCell>
                  {session.is_active ? (
                    <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200 bg-amber-50">
                      <Clock className="h-3 w-3" />
                      Activa
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
                      <CheckCircle2 className="h-3 w-3" />
                      Sellada
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(session.created_at), { addSuffix: true, locale: es })}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/dashboard/session/${session.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

