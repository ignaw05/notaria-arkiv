'use client'

import { useState, use } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Calendar, FileText, MessageSquare, Shield, ShieldCheck, ShieldX, Clock, User, Pencil } from 'lucide-react'
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
  arkiv_entity_id: string | null
  started_at: string
  closed_at: string | null
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

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, error, isLoading, mutate } = useSWR<{ patient: Patient }>(`/api/patients/${id}`, fetcher)
  const [isAddHistoryOpen, setIsAddHistoryOpen] = useState(false)
  const [newHistory, setNewHistory] = useState({
    entryDate: '',
    description: '',
    category: 'other',
  })
  const [isEditHistoryOpen, setIsEditHistoryOpen] = useState(false)
  const [editingHistory, setEditingHistory] = useState<{
    id: string
    entry_date: string
    description: string
    category: string
  } | null>(null)

  const handleAddHistory = async () => {
    if (!newHistory.entryDate || !newHistory.description) {
      toast.error('Fecha y descripcion son requeridos')
      return
    }

    try {
      const res = await fetch(`/api/patients/${id}/history`, {
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

  const handleEditHistory = async () => {
    if (!editingHistory || !editingHistory.entry_date || !editingHistory.description) {
      toast.error('Fecha y descripción son requeridos')
      return
    }

    try {
      const res = await fetch(`/api/patients/${id}/history`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: editingHistory.id,
          entryDate: editingHistory.entry_date,
          description: editingHistory.description,
          category: editingHistory.category,
        }),
      })

      if (!res.ok) throw new Error('Error al actualizar historial')

      toast.success('Historial actualizado exitosamente')
      setEditingHistory(null)
      setIsEditHistoryOpen(false)
      mutate()
    } catch {
      toast.error('Error al actualizar historial')
    }
  }

  const handleStartSession = async () => {
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: id }),
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
        <p className="text-destructive">Error al cargar paciente</p>
      </div>
    )
  }

  if (isLoading || !data?.patient) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const patient = data.patient

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/patients">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{patient.full_name}</h1>
          <div className="flex items-center gap-4 text-muted-foreground text-sm">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {calculateAge(patient.date_of_birth)} años ({format(parseISO(patient.date_of_birth), 'dd/MM/yyyy')})
            </span>
            {patient.identifier && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                DNI: {patient.identifier}
              </span>
            )}
          </div>
        </div>
        <Button onClick={handleStartSession}>
          <MessageSquare className="mr-2 h-4 w-4" />
          Nueva Consulta
        </Button>
      </div>

      {patient.notes && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{patient.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        {/* Medical History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Historial Medico
              </CardTitle>
              <CardDescription>{patient.medical_history?.length || 0} registros</CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsAddHistoryOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Agregar
            </Button>
          </CardHeader>
          <CardContent>
            {!patient.medical_history?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay registros medicos</p>
              </div>
            ) : (
              <div className="space-y-4">
                {patient.medical_history.map((entry) => (
                  <div key={entry.id} className="border-l-2 border-muted pl-4 pb-4 group relative">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {format(parseISO(entry.entry_date), 'dd MMM yyyy', { locale: es })}
                        </span>
                        <Badge className={getCategoryColor(entry.category)} variant="secondary">
                          {getCategoryLabel(entry.category)}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          setEditingHistory({
                            id: entry.id,
                            entry_date: entry.entry_date.split('T')[0],
                            description: entry.description,
                            category: entry.category || 'other',
                          })
                          setIsEditHistoryOpen(true)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </Button>
                    </div>
                    <p className="text-sm pr-8">{entry.description}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Consultas
            </CardTitle>
            <CardDescription>{patient.sessions?.length || 0} sesiones</CardDescription>
          </CardHeader>
          <CardContent>
            {!patient.sessions?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay consultas registradas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {[...patient.sessions]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((session) => (
                    <Link key={session.id} href={`/dashboard/session/${session.id}`}>
                      <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{session.title}</span>
                          {session.is_active ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <Clock className="h-3 w-3 mr-1" />
                              Activa
                            </Badge>
                          ) : session.session_hash ? (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              Sellada
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Cerrada</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{format(parseISO(session.created_at), 'dd/MM/yyyy HH:mm')}</span>
                          {session.arkiv_entity_id && (
                            <Badge variant="outline" className="text-xs">
                              <Shield className="h-3 w-3 mr-1" />
                              Arkiv
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add History Dialog */}
      <Dialog open={isAddHistoryOpen} onOpenChange={setIsAddHistoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Historial Medico</DialogTitle>
            <DialogDescription>
              Agregar nuevo registro para {patient.full_name}
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
      {/* Edit History Dialog */}
      <Dialog open={isEditHistoryOpen} onOpenChange={setIsEditHistoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Registro Médico</DialogTitle>
            <DialogDescription>
              Modifica los detalles del registro de {patient.full_name}
            </DialogDescription>
          </DialogHeader>
          {editingHistory && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="editEntryDate">Fecha del Registro *</Label>
                <Input
                  id="editEntryDate"
                  type="date"
                  value={editingHistory.entry_date}
                  onChange={(e) => setEditingHistory({ ...editingHistory, entry_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editCategory">Categoría</Label>
                <Select
                  value={editingHistory.category}
                  onValueChange={(value) => setEditingHistory({ ...editingHistory, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diagnosis">Diagnóstico</SelectItem>
                    <SelectItem value="treatment">Tratamiento</SelectItem>
                    <SelectItem value="surgery">Cirugía</SelectItem>
                    <SelectItem value="allergy">Alergia</SelectItem>
                    <SelectItem value="medication">Medicación</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editDescription">Descripción *</Label>
                <Textarea
                  id="editDescription"
                  value={editingHistory.description}
                  onChange={(e) => setEditingHistory({ ...editingHistory, description: e.target.value })}
                  placeholder="Detalle del registro médico..."
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditHistoryOpen(false)
              setEditingHistory(null)
            }}>
              Cancelar
            </Button>
            <Button onClick={handleEditHistory}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
