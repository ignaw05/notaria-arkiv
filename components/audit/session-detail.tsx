'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { verifyHashChain } from '@/lib/crypto'
import type { Session, Message, SeverityLevel } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Hash,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  User,
  Bot,
  Building,
  Loader2,
  FileCheck,
} from 'lucide-react'
import { toast } from 'sonner'

interface SessionWithDoctor extends Session {
  profiles: {
    full_name: string | null
    email: string | null
    institution: string | null
    specialty: string | null
  } | null
}

interface VerificationRecord {
  id: string
  is_valid: boolean
  verification_details: Record<string, unknown>
  verified_at: string
  profiles: {
    full_name: string | null
    email: string | null
  } | null
}

interface AuditSessionDetailProps {
  session: SessionWithDoctor
  messages: Message[]
  verifications: VerificationRecord[]
  auditorId: string
}

export function AuditSessionDetail({ 
  session, 
  messages, 
  verifications,
  auditorId 
}: AuditSessionDetailProps) {
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean
    brokenAt?: number
    details: string
  } | null>(null)

  const runVerification = async () => {
    setIsVerifying(true)
    setVerificationResult(null)

    try {
      const result = await verifyHashChain(
        messages.map((m) => ({
          content: m.content,
          role: m.role,
          created_at: m.created_at,
          hash: m.hash,
          previous_hash: m.previous_hash,
        }))
      )

      setVerificationResult(result)

      // Record verification
      const supabase = createClient()
      await supabase.from('integrity_verifications').insert({
        session_id: session.id,
        verified_by: auditorId,
        is_valid: result.isValid,
        verification_details: {
          brokenAt: result.brokenAt,
          details: result.details,
          messageCount: messages.length,
          verifiedAt: new Date().toISOString(),
        },
      })

      toast.success(result.isValid ? 'Integrity verified' : 'Integrity violation detected')
    } catch (error) {
      console.error('Verification failed:', error)
      toast.error('Verification failed')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Verification Alert */}
      {verificationResult && (
        <Alert variant={verificationResult.isValid ? 'default' : 'destructive'}>
          {verificationResult.isValid ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {verificationResult.isValid ? 'Integrity Verified' : 'Integrity Violation'}
          </AlertTitle>
          <AlertDescription>{verificationResult.details}</AlertDescription>
        </Alert>
      )}

      {/* Session Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{session.title || 'Clinical Session'}</CardTitle>
              <CardDescription>Complete audit information</CardDescription>
            </div>
            <Button onClick={runVerification} disabled={isVerifying}>
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Verify Integrity
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                Doctor
              </p>
              <p className="font-medium">{session.profiles?.full_name || 'Unknown'}</p>
              <p className="text-xs text-muted-foreground">{session.profiles?.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <Building className="h-3 w-3" />
                Institution
              </p>
              <p className="font-medium">{session.profiles?.institution || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Patient Hash</p>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                {session.patient_hash}
              </code>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              {session.is_active ? (
                <Badge variant="outline" className="gap-1 text-amber-600">
                  <Clock className="h-3 w-3" />
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Sealed
                </Badge>
              )}
            </div>
          </div>

          {session.session_hash && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Shield className="h-3 w-3" />
                Session Hash
              </p>
              <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                {session.session_hash}
              </code>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Messages and Verifications */}
      <Tabs defaultValue="messages">
        <TabsList>
          <TabsTrigger value="messages">
            Messages ({messages.length})
          </TabsTrigger>
          <TabsTrigger value="verifications">
            Verification History ({verifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div key={message.id} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 text-center">
                        <span className="text-xs text-muted-foreground">{index + 1}</span>
                      </div>
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={message.role === 'user' ? 'default' : 'secondary'}>
                            {message.role}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(message.created_at), 'MMM d, HH:mm:ss')}
                          </span>
                          {message.risk_level && (
                            <RiskBadge level={message.risk_level} />
                          )}
                          {verificationResult?.brokenAt === index && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Broken
                            </Badge>
                          )}
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm whitespace-pre-wrap">
                            {message.content.slice(0, 500)}
                            {message.content.length > 500 && '...'}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            <code className="bg-muted px-1 rounded">
                              {message.hash.slice(0, 32)}...
                            </code>
                          </div>
                          {message.previous_hash && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px]">PREV:</span>
                              <code className="bg-muted px-1 rounded">
                                {message.previous_hash.slice(0, 24)}...
                              </code>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verifications" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {verifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No verification records yet</p>
                  <p className="text-sm">Run a verification to create the first record</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Result</TableHead>
                      <TableHead>Verified By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {verifications.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>
                          {v.is_valid ? (
                            <Badge variant="outline" className="gap-1 text-green-600">
                              <CheckCircle2 className="h-3 w-3" />
                              Valid
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-red-600">
                              <XCircle className="h-3 w-3" />
                              Invalid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{v.profiles?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{v.profiles?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(v.verified_at), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {(v.verification_details as { details?: string })?.details || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
