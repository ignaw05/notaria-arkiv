'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Loader2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { MedicalHistoryEntry } from '@/lib/types'
import { toast } from 'sonner'

interface MedicalHistoryManagerProps {
  patientId: string
}

const categories = [
  { value: 'diagnosis', label: 'Diagnóstico' },
  { value: 'treatment', label: 'Tratamiento' },
  { value: 'surgery', label: 'Cirugía' },
  { value: 'allergy', label: 'Alergia' },
  { value: 'medication', label: 'Medicación' },
  { value: 'other', label: 'Otro' },
]

export function MedicalHistoryManager({ patientId }: MedicalHistoryManagerProps) {
  const [entries, setEntries] = useState<MedicalHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  
  const [formData, setFormData] = useState({
    entry_date: '',
    description: '',
    category: 'other',
  })

  useEffect(() => {
    loadHistory()
  }, [patientId])

  const loadHistory = async () => {
    try {
      const response = await fetch(`/api/patients/${patientId}/history`)
      if (!response.ok) throw new Error('Error loading history')
      const data = await response.json()
      setEntries(data.entries || [])
    } catch (error) {
      console.error('Error loading history:', error)
      toast.error('Error al cargar historial médico')
    } finally {
      setLoading(false)
    }
  }

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const response = await fetch(`/api/patients/${patientId}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Error adding entry')
      const data = await response.json()
      
      setEntries([...entries, data.entry])
      setFormData({ entry_date: '', description: '', category: 'other' })
      setShowForm(false)
      toast.success('Entrada agregada al historial')
    } catch (error) {
      console.error('Error adding entry:', error)
      toast.error('Error al agregar entrada')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta entrada?')) return

    try {
      const response = await fetch(`/api/patients/${patientId}/history`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId }),
      })

      if (!response.ok) throw new Error('Error deleting entry')
      setEntries(entries.filter(e => e.id !== entryId))
      toast.success('Entrada eliminada')
    } catch (error) {
      console.error('Error deleting entry:', error)
      toast.error('Error al eliminar entrada')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Historial Médico</h3>
        <Button
          onClick={() => setShowForm(!showForm)}
          size="sm"
          variant={showForm ? 'default' : 'outline'}
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Entrada
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nueva Entrada Médica</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddEntry} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="entry_date">Fecha</Label>
                <Input
                  id="entry_date"
                  type="date"
                  required
                  value={formData.entry_date}
                  onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe la entrada médica en detalle..."
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Guardar Entrada
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No hay entradas en el historial médico</p>
        ) : (
          entries
            .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime())
            .map((entry) => (
              <Card key={entry.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">
                          {categories.find(c => c.value === entry.category)?.label || 'Otro'}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.entry_date), 'dd \'de\' MMMM \'de\' yyyy', { locale: es })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{entry.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
        )}
      </div>
    </div>
  )
}
