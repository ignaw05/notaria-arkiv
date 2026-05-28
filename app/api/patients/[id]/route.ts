import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/patients/[id] - Get a patient with medical history
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
  
  const { data: patient, error } = await supabase
    .from('patients')
    .select(`
      *,
      medical_history (
        id,
        entry_date,
        description,
        category,
        created_at
      ),
      sessions (
        id,
        title,
        is_active,
        session_hash,
        arkiv_entity_id,
        started_at,
        closed_at,
        created_at
      )
    `)
    .eq('id', id)
    .single()
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }
  
  return NextResponse.json({ patient })
}

// PUT /api/patients/[id] - Update a patient
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
  
  const body = await request.json()
  const { fullName, dateOfBirth, identifier, notes } = body
  
  const { data: patient, error } = await supabase
    .from('patients')
    .update({
      full_name: fullName,
      date_of_birth: dateOfBirth,
      identifier,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('doctor_id', user.id)
    .select()
    .single()
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ patient })
}

// DELETE /api/patients/[id] - Delete a patient
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  
  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', id)
    .eq('doctor_id', user.id)
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ success: true })
}
