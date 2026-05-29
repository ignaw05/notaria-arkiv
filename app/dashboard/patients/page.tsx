'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus, User, Calendar, FileText, MessageSquare, History, ChevronRight, Clock, Activity, ShieldCheck, ExternalLink, Copy, Check, Lock } from 'lucide-react'
import Link from 'next/link'
import { format, differenceInYears, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Patient {
  id: string
  full_name: string
  date_of_birth: string
  identifier: string | null
  notes: string | null
  created_at: string
  medical_history: MedicalHistoryEntry[]
  sessions: SessionSummary[]
}

interface MedicalHistoryEntry {
  id: string
  entry_date: string
  description: string
  category: string | null
  created_at: string
}

interface SessionSummary {
  id: string
  title: string
  is_active: boolean
  session_hash: string | null
  created_at: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

function calculateAge(dateOfBirth: string): number {
  return differenceInYears(new Date(), parseISO(dateOfBirth))
}

function getCategoryColor(category: string | null): string {
  const colors: Record<string, string> = {
    diagnosis: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    treatment: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    surgery: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    allergy: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    medication: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    other: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  }
  return colors[category || 'other'] || colors.other
}

function getCategoryLabel(category: string | null): string {
  const labels: Record<string, string> = {
    diagnosis: 'Diagnostico',
    treatment: 'Tratamiento',
    surgery: 'Cirugia',
    allergy: 'Alergia',
    medication: 'Medicacion',
    other: 'Otro',
  }
  return labels[category || 'other'] || 'Otro'
}

export default function PatientsPage() {
  const { data, error, isLoading, mutate } = useSWR<{ patients: Patient[] }>('/api/patients', fetcher)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [isAddHistoryOpen, setIsAddHistoryOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [arkivInfo, setArkivInfo] = useState<{
    entityKey: string | null
    txHash: string | null
    explorerUrl: string | null
    txUrl: string | null
    patientName: string
  } | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    setTimeout(() => setCopiedText(null), 2000)
  }

  // Create patient form state
  const [newPatient, setNewPatient] = useState({
    fullName: '',
    dateOfBirth: '',
    identifier: '',
    notes: '',
  })

  // Add history form state
  const [newHistory, setNewHistory] = useState({
    entryDate: '',
    description: '',
    category: 'other',
  })

  const handleCreatePatient = async () => {
    if (!newPatient.fullName || !newPatient.dateOfBirth) {
      toast.error('Nombre y fecha de nacimiento son requeridos')
      return
    }

    setIsCreating(true)
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatient),
      })

      if (!res.ok) throw new Error('Error al crear paciente')

      const data = await res.json()
      
      if (data.arkiv && data.arkiv.entityKey) {
        setArkivInfo({
          entityKey: data.arkiv.entityKey,
          txHash: data.arkiv.txHash,
          explorerUrl: data.arkiv.explorerUrl,
          txUrl: data.arkiv.txUrl,
          patientName: data.patient.full_name
        })
      } else {
        toast.success('Paciente creado exitosamente')
      }

      setNewPatient({ fullName: '', dateOfBirth: '', identifier: '', notes: '' })
      setIsCreateOpen(false)
      mutate()
    } catch {
      toast.error('Error al crear paciente')
    } finally {
      setIsCreating(false)
    }
  }

  const handleAddHistory = async () => {
    if (!selectedPatient || !newHistory.entryDate || !newHistory.description) {
      toast.error('Fecha y descripcion son requeridos')
      return
    }

    try {
      const res = await fetch(`/api/patients/${selectedPatient.id}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHistory),
      })

      if (!res.ok) throw new Error('Error al agregar historial')

      toast.success('Historial agregado exitosamente')
      setNewHistory({ entryDate: '', description: '', category: 'other' })
      setIsAddHistoryOpen(false)
      mutate()
    } catch {
      toast.error('Error al agregar historial')
    }
  }

  const handleStartSession = async (patientId: string) => {
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId }),
      })

      if (!res.ok) throw new Error('Error al crear sesion')

      const data = await res.json()
      window.location.href = `/dashboard/session/${data.session.id}`
    } catch {
      toast.error('Error al iniciar consulta')
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-destructive">Error al cargar pacientes</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pacientes</h1>
          <p className="text-muted-foreground">Gestiona tus pacientes y su historial medico</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Paciente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Paciente</DialogTitle>
              <DialogDescription>
                Ingresa los datos del paciente para comenzar a registrar su historial.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName">Nombre Completo *</Label>
                <Input
                  id="fullName"
                  value={newPatient.fullName}
                  onChange={(e) => setNewPatient({ ...newPatient, fullName: e.target.value })}
                  placeholder="Juan Perez"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dateOfBirth">Fecha de Nacimiento *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={newPatient.dateOfBirth}
                  onChange={(e) => setNewPatient({ ...newPatient, dateOfBirth: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="identifier">DNI / Identificador</Label>
                <Input
                  id="identifier"
                  value={newPatient.identifier}
                  onChange={(e) => setNewPatient({ ...newPatient, identifier: e.target.value })}
                  placeholder="12345678"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={newPatient.notes}
                  onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
                  placeholder="Observaciones generales..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreatePatient} disabled={isCreating}>
                {isCreating ? 'Creando...' : 'Crear Paciente'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <div className="h-5 bg-muted rounded w-2/3" />
                  <div className="flex gap-2 items-center">
                    <div className="h-4 bg-muted rounded w-1/4" />
                    <div className="h-4 bg-muted rounded w-1/3" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-4 bg-muted rounded w-1/4" />
                  <div className="h-4 bg-muted rounded w-1/4" />
                </div>
                <div className="space-y-2 pt-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-24 bg-muted/40 rounded-lg p-3 space-y-2">
                    <div className="h-5 bg-muted rounded w-1/4" />
                    <div className="h-4 bg-muted rounded w-5/6" />
                  </div>
                </div>
                <div className="h-10 bg-[#1e3a8a]/20 dark:bg-[#1e3a8a]/10 rounded w-full mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !data?.patients?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay pacientes</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comienza agregando tu primer paciente para gestionar su historial médico.
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Paciente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.patients.map((patient) => (
            <Card key={patient.id} className="hover:shadow-md transition-all duration-350 border border-border/80">
              <CardContent className="p-6 space-y-4">
                {/* Header Info */}
                <div className="space-y-1.5">
                  <h2 className="text-lg font-bold text-foreground leading-none">{patient.full_name}</h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 text-muted-foreground/80" />
                    <span>{calculateAge(patient.date_of_birth)} años</span>
                    {patient.identifier && (
                      <>
                        <span>•</span>
                        <span>DNI: {patient.identifier}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Counts */}
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-muted-foreground/80" />
                    <span>
                      {patient.medical_history?.length || 0}{' '}
                      {(patient.medical_history?.length || 0) === 1 ? 'registro' : 'registros'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-muted-foreground/80" />
                    <span>
                      {patient.sessions?.length || 0}{' '}
                      {(patient.sessions?.length || 0) === 1 ? 'consulta' : 'consultas'}
                    </span>
                  </div>
                </div>

                {/* Last Medical Record */}
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground font-semibold block uppercase tracking-wider">Último registro:</span>
                  {patient.medical_history && patient.medical_history.length > 0 ? (
                    <div className="text-sm p-4 bg-muted/40 border border-border/30 rounded-lg space-y-2.5">
                      <Badge className={cn('text-[10px] h-5 py-0 px-2 font-bold select-none', getCategoryColor(patient.medical_history[0].category))} variant="secondary">
                        {getCategoryLabel(patient.medical_history[0].category)}
                      </Badge>
                      <p className="text-foreground/80 line-clamp-2 leading-relaxed text-xs">
                        {patient.medical_history[0].description}
                      </p>
                    </div>
                  ) : (
                    <div className="text-sm p-4 bg-muted/20 border border-dashed rounded-lg text-center text-muted-foreground text-xs">
                      Sin registros médicos.
                    </div>
                  )}
                </div>

                {/* Historial Médico Action */}
                <Button
                  asChild
                  className="w-full bg-[#1e3a8a] hover:bg-[#172554] text-white h-11 font-medium transition-colors mt-2"
                >
                  <Link href={`/dashboard/patients/${patient.id}`}>
                    <FileText className="mr-2 h-4 w-4" />
                    Historial Médico
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add History Dialog */}
      <Dialog open={isAddHistoryOpen} onOpenChange={setIsAddHistoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Historial Medico</DialogTitle>
            <DialogDescription>
              {selectedPatient && `Agregar registro para ${selectedPatient.full_name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="entryDate">Fecha del Registro *</Label>
              <Input
                id="entryDate"
                type="date"
                value={newHistory.entryDate}
                onChange={(e) => setNewHistory({ ...newHistory, entryDate: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={newHistory.category}
                onValueChange={(value) => setNewHistory({ ...newHistory, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diagnosis">Diagnostico</SelectItem>
                  <SelectItem value="treatment">Tratamiento</SelectItem>
                  <SelectItem value="surgery">Cirugia</SelectItem>
                  <SelectItem value="allergy">Alergia</SelectItem>
                  <SelectItem value="medication">Medicacion</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descripcion *</Label>
              <Textarea
                id="description"
                value={newHistory.description}
                onChange={(e) => setNewHistory({ ...newHistory, description: e.target.value })}
                placeholder="Detalle del registro medico..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddHistoryOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddHistory}>
              Agregar Registro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Arkiv Patient Notarization Success Dialog */}
      <Dialog open={arkivInfo !== null} onOpenChange={(open) => !open && setArkivInfo(null)}>
        {arkivInfo && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="mx-auto bg-green-500/10 p-3 rounded-full text-green-600 mb-2 w-fit">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <DialogTitle className="text-center text-lg font-bold">
                ¡Paciente Notarizado Exitosamente!
              </DialogTitle>
              <DialogDescription className="text-center text-xs">
                Se ha generado un registro médico inmutable y protegido para <span className="font-semibold text-foreground">{arkivInfo.patientName}</span> en Arkiv Network.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2 text-xs">
              <div className="space-y-1">
                <p className="text-muted-foreground font-semibold">Identificador de Registro Público (Entity Key)</p>
                <div className="flex items-center gap-1.5 bg-muted/40 p-2 rounded border border-border/50">
                  <code className="font-mono text-foreground text-[10px] break-all flex-1">
                    {arkivInfo.entityKey}
                  </code>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5 hover:bg-background shrink-0"
                    onClick={() => arkivInfo.entityKey && handleCopy(arkivInfo.entityKey)}
                  >
                    {copiedText === arkivInfo.entityKey ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                  </Button>
                </div>
              </div>

              {arkivInfo.txHash && (
                <div className="space-y-1">
                  <p className="text-muted-foreground font-semibold">Hash de Transacción Braga</p>
                  <div className="flex items-center gap-1.5 bg-muted/40 p-2 rounded border border-border/50">
                    <code className="font-mono text-foreground text-[10px] break-all flex-1">
                      {arkivInfo.txHash}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5 hover:bg-background shrink-0"
                      onClick={() => arkivInfo.txHash && handleCopy(arkivInfo.txHash)}
                    >
                      {copiedText === arkivInfo.txHash ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                {arkivInfo.explorerUrl && (
                  <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 w-full">
                    <a href={arkivInfo.explorerUrl} target="_blank" rel="noopener noreferrer">
                      Verificar Registro en la Red
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </Button>
                )}
                {arkivInfo.txUrl && (
                  <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 w-full">
                    <a href={arkivInfo.txUrl} target="_blank" rel="noopener noreferrer">
                      Ver Transacción en Explorador
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
            
            <DialogFooter className="sm:justify-center">
              <Button onClick={() => setArkivInfo(null)} className="w-full sm:max-w-[120px]">
                Entendido
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
