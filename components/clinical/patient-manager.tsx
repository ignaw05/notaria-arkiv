'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Loader2 } from 'lucide-react'
import type { Patient } from '@/lib/types'
import { toast } from 'sonner'

interface PatientManagerProps {
  onPatientSelected?: (patient: Patient) => void
}

export function PatientManager({ onPatientSelected }: PatientManagerProps) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    identifier: '',
    notes: '',
  })

  useEffect(() => {
    loadPatients()
  }, [])

  const loadPatients = async () => {
    try {
      const response = await fetch('/api/patients')
      if (!response.ok) throw new Error('Error loading patients')
      const data = await response.json()
      setPatients(data.patients || [])
    } catch (error) {
      console.error('Error loading patients:', error)
      toast.error('Error al cargar pacientes')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Error creating patient')
      const data = await response.json()
      
      setPatients([...patients, data.patient])
      setFormData({ full_name: '', date_of_birth: '', identifier: '', notes: '' })
      setShowForm(false)
      toast.success('Paciente creado exitosamente')
      
      if (onPatientSelected) {
        onPatientSelected(data.patient)
      }
    } catch (error) {
      console.error('Error creating patient:', error)
      toast.error('Error al crear paciente')
    } finally {
      setCreating(false)
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
        <h3 className="text-lg font-semibold">Pacientes</h3>
        <Button
          onClick={() => setShowForm(!showForm)}
          size="sm"
          variant={showForm ? 'default' : 'outline'}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Paciente
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Crear Nuevo Paciente</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreatePatient} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre Completo</Label>
                <Input
                  id="full_name"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Ej: Juan Pérez García"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Fecha de Nacimiento</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  required
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="identifier">DNI / Identificador</Label>
                <Input
                  id="identifier"
                  value={formData.identifier}
                  onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                  placeholder="Ej: 12345678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Información adicional"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Crear Paciente
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

      <div className="grid gap-3">
        {patients.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No hay pacientes. Crea uno para comenzar.</p>
        ) : (
          patients.map((patient) => (
            <Card key={patient.id} className="cursor-pointer hover:border-primary transition-colors">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div
                    onClick={() => onPatientSelected?.(patient)}
                    className="flex-1"
                  >
                    <h4 className="font-semibold">{patient.full_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {patient.identifier && `DNI: ${patient.identifier} • `}
                      Edad: {new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()} años
                    </p>
                    {patient.notes && (
                      <p className="text-sm mt-1">{patient.notes}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
