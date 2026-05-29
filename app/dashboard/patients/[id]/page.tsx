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
import { ArrowLeft, Plus, Calendar, FileText, MessageSquare, Shield, ShieldCheck, ShieldX, Clock, User, Pencil, ChevronLeft, ChevronRight } from 'lucide-react'
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
  summary: string | null
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

function calculateAge(dateOfBirth: string): number {
  return differenceInYears(new Date(), parseISO(dateOfBirth))
}

function getCategoryColor(category: string | null): string {
  const colors: Record<string, string> = {
    diagnosis: 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-50 shadow-none font-medium',
    treatment: 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-50 shadow-none font-medium',
    surgery: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-50 shadow-none font-medium',
    allergy: 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-50 shadow-none font-medium',
    medication: 'bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-50 shadow-none font-medium',
    other: 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-50 shadow-none font-medium',
  }
  return colors[category || 'other'] || colors.other
}

function getCategoryLabel(category: string | null): string {
  const labels: Record<string, string> = {
    diagnosis: 'Diagnóstico',
    treatment: 'Tratamiento',
    surgery: 'Cirugía',
    allergy: 'Alergia',
    medication: 'Medicación',
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

  const [isStartingSession, setIsStartingSession] = useState(false)

  const handleStartSession = async () => {
    if (isStartingSession) return
    setIsStartingSession(true)
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
      setIsStartingSession(false)
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
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full animate-none" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-48 animate-none" />
              <Skeleton className="h-4 w-32 animate-none" />
            </div>
          </div>
          <Skeleton className="h-10 w-36 rounded-xl animate-none" />
        </div>

        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left Column - Medical History Skeleton */}
          <div className="border border-slate-100 shadow-sm rounded-2xl p-6 lg:col-span-5 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-36 animate-none" />
                <Skeleton className="h-3 w-20 animate-none" />
              </div>
              <Skeleton className="h-8 w-24 rounded-xl animate-none" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-slate-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16 animate-none" />
                    <Skeleton className="h-5 w-20 rounded animate-none" />
                  </div>
                  <Skeleton className="h-4 w-full animate-none" />
                  <Skeleton className="h-4 w-2/3 animate-none" />
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Sessions Skeleton */}
          <div className="border border-slate-100 shadow-sm rounded-2xl p-6 lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-28 animate-none" />
              <Skeleton className="h-3 w-16 animate-none" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-slate-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-1/2 animate-none" />
                    <Skeleton className="h-5 w-16 rounded-full animate-none" />
                  </div>
                  <Skeleton className="h-4 w-3/4 animate-none" />
                  <Skeleton className="h-3 w-12 animate-none" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const patient = data.patient

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/patients">
            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-slate-100 rounded-full">
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{patient.full_name}</h1>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              {calculateAge(patient.date_of_birth)} años{patient.identifier ? ` • DNI: ${patient.identifier}` : ''}
            </p>
          </div>
        </div>
        <Button 
          onClick={handleStartSession} 
          disabled={isStartingSession}
          className="bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90 font-semibold px-4 py-2 h-10 rounded-xl flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {isStartingSession ? 'Iniciando...' : 'Nueva Consulta'}
        </Button>
      </div>

      {patient.notes && (
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-sm text-slate-600 font-medium">
          {patient.notes}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Medical History */}
        <Card className="border border-slate-100 shadow-sm rounded-2xl lg:col-span-5">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-800">
                <FileText className="h-5 w-5 text-slate-500" />
                <CardTitle className="text-lg font-bold text-slate-800">Historial Médico</CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500">{patient.medical_history?.length || 0} registros</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsAddHistoryOpen(true)}
              className="border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-medium px-3 flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar
            </Button>
          </CardHeader>
          <CardContent>
            {!patient.medical_history?.length ? (
              <div className="text-center py-12 text-slate-400">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No hay registros médicos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {patient.medical_history.map((entry) => (
                  <div key={entry.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 group relative hover:border-slate-200 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400">
                          {format(parseISO(entry.entry_date), 'dd MMM yyyy', { locale: es })}
                        </span>
                        <Badge className={getCategoryColor(entry.category)} variant="secondary">
                          {getCategoryLabel(entry.category)}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200 rounded-lg absolute top-3 right-3"
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
                        <Pencil className="h-3 w-3 text-slate-500 hover:text-slate-700" />
                      </Button>
                    </div>
                    <div className="text-sm text-slate-700 font-medium space-y-1 pr-6 leading-relaxed">
                      {entry.description.split('\n').map((line, idx) => (
                        <p key={idx}>{line}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sessions */}
        <Card className="border border-slate-100 shadow-sm rounded-2xl lg:col-span-7">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 text-slate-800">
              <Calendar className="h-5 w-5 text-slate-500" />
              <CardTitle className="text-lg font-bold text-slate-800">Consultas</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">{patient.sessions?.length || 0} sesiones</CardDescription>
          </CardHeader>
          <CardContent>
            {!patient.sessions?.length ? (
              <div className="text-center py-12 text-slate-400">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No hay consultas registradas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...patient.sessions]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((session) => {
                    const formattedDate = format(parseISO(session.created_at), 'd/M/yyyy');
                    const timeStr = format(parseISO(session.created_at), 'HH:mm');
                    return (
                      <Link key={session.id} href={`/dashboard/session/${session.id}`} className="block">
                        <div className="border border-slate-100 hover:border-slate-200 rounded-xl p-4 hover:bg-slate-50/50 transition-colors flex items-center justify-between group">
                          <div className="space-y-2 flex-1 pr-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-slate-800 text-sm">
                                Consulta - {patient.full_name} - {formattedDate}
                              </span>
                              {session.is_active ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse mr-0.5" />
                                  Activa
                                </span>
                              ) : session.session_hash ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  <ShieldCheck className="h-3.5 w-3.5 mr-0.5" />
                                  Sellada
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                                  Cerrada
                                </span>
                              )}
                            </div>
                            {session.summary ? (
                              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                {session.summary}
                              </p>
                            ) : (
                              <p className="text-sm text-slate-400 italic font-medium">Sin resumen disponible</p>
                            )}
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mt-1">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{timeStr}</span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors mr-1" />
                        </div>
                      </Link>
                    )
                  })}
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
