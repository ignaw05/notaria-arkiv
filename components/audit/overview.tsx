'use client'

import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Activity,
  FileCheck,
  MessageSquare,
  Users,
  Shield,
  CheckCircle2,
  Clock,
  Eye,
  AlertTriangle,
} from 'lucide-react'

interface SessionWithDoctor {
  id: string
  doctor_id: string
  patient_hash: string
  title: string | null
  is_active: boolean
  session_hash: string | null
  created_at: string
  closed_at: string | null
  profiles: {
    full_name: string | null
    email: string | null
    institution: string | null
  } | null
}

interface AuditStats {
  totalSessions: number
  activeSessions: number
  totalMessages: number
  verifiedSessions: number
}

interface AuditOverviewProps {
  sessions: SessionWithDoctor[]
  stats: AuditStats
}

export function AuditOverview({ sessions, stats }: AuditOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sessions"
          value={stats.totalSessions}
          description="All clinical sessions"
          icon={FileCheck}
        />
        <StatCard
          title="Active Sessions"
          value={stats.activeSessions}
          description="Currently in progress"
          icon={Activity}
          highlight={stats.activeSessions > 0}
        />
        <StatCard
          title="Total Messages"
          value={stats.totalMessages}
          description="AI interactions recorded"
          icon={MessageSquare}
        />
        <StatCard
          title="Verified Sessions"
          value={stats.verifiedSessions}
          description="Integrity confirmed"
          icon={Shield}
        />
      </div>

      {/* Recent Sessions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Sessions</CardTitle>
              <CardDescription>Latest clinical AI sessions across all users</CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard/audit/verify">
                <Shield className="mr-2 h-4 w-4" />
                Verify Session
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div className="font-medium">
                      {session.title || 'Untitled Session'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {session.id.slice(0, 8)}...
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {session.profiles?.full_name || 'Unknown'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {session.profiles?.email}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {session.profiles?.institution || '-'}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {session.patient_hash}
                    </code>
                  </TableCell>
                  <TableCell>
                    {session.is_active ? (
                      <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200 bg-amber-50">
                        <Clock className="h-3 w-3" />
                        Active
                      </Badge>
                    ) : session.session_hash ? (
                      <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
                        <CheckCircle2 className="h-3 w-3" />
                        Sealed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-orange-600 border-orange-200 bg-orange-50">
                        <AlertTriangle className="h-3 w-3" />
                        Incomplete
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(session.created_at), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/dashboard/audit/session/${session.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Audit
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  highlight = false,
}: {
  title: string
  value: number
  description: string
  icon: React.ElementType
  highlight?: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${highlight ? 'text-amber-500' : 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${highlight ? 'text-amber-600' : ''}`}>
          {value.toLocaleString()}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
