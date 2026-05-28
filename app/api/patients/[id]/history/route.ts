import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/patients/[id]/history - Get medical history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  
  const { data: history, error } = await supabase
    .from('medical_history')
    .select('*')
    .eq('patient_id', id)
    .order('entry_date', { ascending: false })
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ history })
}

// POST /api/patients/[id]/history - Add medical history entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  
  // Verify patient belongs to doctor
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id')
    .eq('id', id)
    .eq('doctor_id', user.id)
    .single()
  
  if (patientError || !patient) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
  }
  
  const body = await request.json()
  const { entryDate, description, category } = body
  
  if (!entryDate || !description) {
    return NextResponse.json(
      { error: 'Fecha y descripcion son requeridos' },
      { status: 400 }
    )
  }
  
  const { data: entry, error } = await supabase
    .from('medical_history')
    .insert({
      patient_id: id,
      entry_date: entryDate,
      description,
      category: category || 'other',
    })
    .select()
    .single()
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  // Log audit
  await supabase.from('audit_logs').insert({
    action: 'medical_history_added',
    actor_id: user.id,
    resource_type: 'medical_history',
    resource_id: entry.id,
    details: { patientId: id, category },
  })
  
  return NextResponse.json({ entry }, { status: 201 })
}

// PUT /api/patients/[id]/history - Edit medical history entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  
  // Verify patient belongs to doctor
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id')
    .eq('id', id)
    .eq('doctor_id', user.id)
    .single()
  
  if (patientError || !patient) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
  }
  
  const body = await request.json()
  const { entryId, entryDate, description, category } = body
  
  if (!entryId || !entryDate || !description) {
    return NextResponse.json(
      { error: 'ID de registro, fecha y descripción son requeridos' },
      { status: 400 }
    )
  }
  
  const { data: entry, error } = await supabase
    .from('medical_history')
    .update({
      entry_date: entryDate,
      description,
      category: category || 'other',
    })
    .eq('id', entryId)
    .eq('patient_id', id)
    .select()
    .single()
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  // Log audit
  await supabase.from('audit_logs').insert({
    action: 'medical_history_updated',
    actor_id: user.id,
    resource_type: 'medical_history',
    resource_id: entry.id,
    details: { patientId: id, category },
  })
  
  return NextResponse.json({ entry })
}

