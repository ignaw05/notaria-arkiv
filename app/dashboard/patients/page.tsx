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
import { Plus, User, Calendar, FileText, MessageSquare, History, ChevronRight, Clock, Activity } from 'lucide-react'
import Link from 'next/link'
import { format, differenceInYears, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

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

      toast.success('Paciente creado exitosamente')
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
    <div className="space-y-6">
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
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
              Comienza agregando tu primer paciente para gestionar su historial medico.
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Paciente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.patients.map((patient) => (
            <Card key={patient.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{patient.full_name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3" />
                      {calculateAge(patient.date_of_birth)} años
                      {patient.identifier && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          DNI: {patient.identifier}
                        </>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <History className="h-4 w-4" />
                    {patient.medical_history?.length || 0} registros
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    {patient.sessions?.length || 0} consultas
                  </div>
                </div>

                {patient.medical_history?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Ultimo registro:</p>
                    <div className="text-sm p-2 bg-muted rounded">
                      <Badge className={getCategoryColor(patient.medical_history[0].category)} variant="secondary">
                        {getCategoryLabel(patient.medical_history[0].category)}
                      </Badge>
                      <p className="mt-1 line-clamp-2">{patient.medical_history[0].description}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleStartSession(patient.id)}
                  >
                    <MessageSquare className="mr-1 h-3 w-3" />
                    Nueva Consulta
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedPatient(patient)
                      setIsAddHistoryOpen(true)
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Link href={`/dashboard/patients/${patient.id}`}>
                    <Button variant="outline" size="sm">
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
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
    </div>
  )
}
