'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Shield, 
  Lock, 
  ExternalLink, 
  Search, 
  FileText, 
  User, 
  Check, 
  Copy, 
  RefreshCw, 
  AlertCircle 
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface CorrelatedSession {
  id: string
  title: string
  patientId: string
  patientName: string
  hash: string
  entityKey: string
  owner: string
  creator: string
  explorerUrl: string
  messageCount: number
  sealedAt: string | null
  isVerifiedOnChain: boolean
}

interface CorrelatedPatient {
  id: string
  name: string
  entityKey: string
  owner: string
  creator: string
  explorerUrl: string
  registeredAt: string | null
  identifier: string | null
  isVerifiedOnChain: boolean
}

export function ArkivRecords() {
  const [sessions, setSessions] = useState<CorrelatedSession[]>([])
  const [patients, setPatients] = useState<CorrelatedPatient[]>([])
  const [doctorWallet, setDoctorWallet] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/arkiv-records')
      if (!response.ok) {
        throw new Error('Error al obtener los registros descentralizados')
      }
      const data = await response.json()
      setSessions(data.sessions || [])
      setPatients(data.patients || [])
      setDoctorWallet(data.doctorWallet)
    } catch (err: any) {
      setError(err.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(text)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const formatAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const filteredSessions = sessions.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.patientName.toLowerCase().includes(search.toLowerCase()) ||
      s.entityKey.toLowerCase().includes(search.toLowerCase())
  )

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.entityKey.toLowerCase().includes(search.toLowerCase()) ||
      (p.identifier && p.identifier.toLowerCase().includes(search.toLowerCase()))
  )

  const renderSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="w-full">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-4 w-1/4 mt-1" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mis Registros Descentralizados</h1>
          <p className="text-muted-foreground text-sm">
            Historial de registros médicos almacenados de forma inmutable y protegida en Arkiv Network.
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" className="h-9 shrink-0 gap-1.5">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Wallet Info Banner */}
      {doctorWallet && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-full text-primary">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Tu Identidad Digital Conectada</p>
                <p className="font-mono text-xs text-muted-foreground">{doctorWallet}</p>
              </div>
            </div>
            <Badge className="bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400">
              Propietario Soberano
            </Badge>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/30 bg-destructive/5 text-destructive-foreground">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 text-destructive shrink-0" />
            <div>
              <p className="font-semibold text-sm">Error al cargar datos</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, paciente o clave..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="sessions" className="gap-2">
            <FileText className="w-4 h-4" />
            Consultas ({loading ? '...' : sessions.length})
          </TabsTrigger>
          <TabsTrigger value="patients" className="gap-2">
            <User className="w-4 h-4" />
            Pacientes ({loading ? '...' : patients.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4 pt-2">
          {loading ? (
            renderSkeleton()
          ) : filteredSessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No se encontraron consultas</h3>
                <p className="text-muted-foreground max-w-md">
                  {search ? 'No hay consultas que coincidan con tu búsqueda.' : 'Aún no tienes consultas selladas y registradas en la red.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredSessions.map((session) => {
                const isOwner = doctorWallet && session.owner.toLowerCase() === doctorWallet.toLowerCase()
                return (
                  <Card key={session.id} className="overflow-hidden border-border/80 hover:border-border transition-all">
                    <CardHeader className="bg-muted/10 pb-3 border-b border-border/50">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <div className="space-y-1">
                          <CardTitle className="text-base font-semibold">{session.title}</CardTitle>
                          <CardDescription className="text-xs flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">{session.patientName}</span>
                            <span>•</span>
                            <span>{session.messageCount} mensajes</span>
                            {session.sealedAt && (
                              <>
                                <span>•</span>
                                <span>Sellado el {format(new Date(session.sealedAt), "d 'de' MMMM, yyyy", { locale: es })}</span>
                              </>
                            )}
                          </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {isOwner ? (
                            <Badge className="bg-primary/10 text-primary border-primary/20 gap-1 font-normal text-xs">
                              <Shield className="w-3.5 h-3.5" />
                              Tu Propiedad
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1 font-normal text-xs">
                              Propiedad Externa
                            </Badge>
                          )}
                          <Badge className="bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400 gap-1 font-normal text-xs">
                            <Lock className="w-3.5 h-3.5" />
                            Firmado
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-5 space-y-4">
                      {/* Monospace Blockchain Identifiers */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-muted/30 p-3 rounded-lg border border-border/50">
                        <div>
                          <p className="text-muted-foreground font-semibold mb-1">Clave de Registro Descentralizado</p>
                          <div className="flex items-center gap-1.5">
                            <code className="font-mono text-foreground bg-background px-1.5 py-0.5 rounded border text-[10px] break-all">
                              {session.entityKey}
                            </code>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5 hover:bg-background"
                              onClick={() => handleCopy(session.entityKey)}
                            >
                              {copiedKey === session.entityKey ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                            </Button>
                          </div>
                        </div>

                        <div>
                          <p className="text-muted-foreground font-semibold mb-1">Firma Criptográfica (Hash)</p>
                          <div className="flex items-center gap-1.5">
                            <code className="font-mono text-foreground bg-background px-1.5 py-0.5 rounded border text-[10px] break-all">
                              {session.hash}
                            </code>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5 hover:bg-background"
                              onClick={() => handleCopy(session.hash)}
                            >
                              {copiedKey === session.hash ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Blockchain Metadata Details */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs gap-3">
                        <div className="space-y-1">
                          <p className="text-muted-foreground">
                            Creador del Registro:{' '}
                            <span className="font-mono text-foreground">{formatAddress(session.creator)}</span>
                            <span className="text-[10px] text-muted-foreground italic ml-1">(NotarIA Server)</span>
                          </p>
                          <p className="text-muted-foreground">
                            Propietario Actual:{' '}
                            <span className="font-mono text-foreground">{formatAddress(session.owner)}</span>
                            {isOwner && <span className="text-[10px] text-primary italic ml-1">(Tu Wallet)</span>}
                          </p>
                        </div>
                        <Button asChild variant="outline" size="sm" className="h-8 gap-1 self-stretch sm:self-auto">
                          <a href={session.explorerUrl} target="_blank" rel="noopener noreferrer">
                            Verificar en Braga Testnet
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="patients" className="space-y-4 pt-2">
          {loading ? (
            renderSkeleton()
          ) : filteredPatients.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <User className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No se encontraron pacientes</h3>
                <p className="text-muted-foreground max-w-md">
                  {search ? 'No hay pacientes que coincidan con tu búsqueda.' : 'Aún no tienes pacientes registrados on-chain.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredPatients.map((patient) => {
                const isOwner = doctorWallet && patient.owner.toLowerCase() === doctorWallet.toLowerCase()
                return (
                  <Card key={patient.id} className="overflow-hidden border-border/80 hover:border-border transition-all flex flex-col justify-between">
                    <CardHeader className="bg-muted/10 pb-3 border-b border-border/50">
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1">
                          <CardTitle className="text-base font-semibold">{patient.name}</CardTitle>
                          {patient.identifier && (
                            <CardDescription className="text-xs font-mono">
                              DNI / ID: {patient.identifier}
                            </CardDescription>
                          )}
                        </div>
                        <Badge className="bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400 gap-1 font-normal text-xs shrink-0">
                          <Shield className="w-3.5 h-3.5" />
                          Registrado
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="text-xs">
                          <p className="text-muted-foreground font-semibold mb-1">Clave de Registro Descentralizado</p>
                          <div className="flex items-center gap-1.5 bg-muted/40 p-1.5 rounded border border-border/50">
                            <code className="font-mono text-foreground text-[10px] break-all flex-1">
                              {patient.entityKey}
                            </code>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5 hover:bg-background shrink-0"
                              onClick={() => handleCopy(patient.entityKey)}
                            >
                              {copiedKey === patient.entityKey ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                            </Button>
                          </div>
                        </div>

                        <div className="text-xs space-y-1">
                          <p className="text-muted-foreground">
                            Propietario Actual:{' '}
                            <span className="font-mono text-foreground">{formatAddress(patient.owner)}</span>
                            {isOwner && <span className="text-[10px] text-primary italic ml-1">(Tu Wallet)</span>}
                          </p>
                          <p className="text-muted-foreground">
                            Creador del Registro:{' '}
                            <span className="font-mono text-foreground">{formatAddress(patient.creator)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {patient.registeredAt && `Registrado: ${format(new Date(patient.registeredAt), 'dd/MM/yyyy')}`}
                        </span>
                        <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1 shrink-0">
                          <a href={patient.explorerUrl} target="_blank" rel="noopener noreferrer">
                            Verificar Registro
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
