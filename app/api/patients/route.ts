import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { registerPatientOnArkiv, isArkivConfigured } from '@/lib/arkiv'

// GET /api/patients - List all patients for the current doctor
export async function GET() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  
  const { data: patients, error } = await supabase
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
        created_at
      )
    `)
    .eq('doctor_id', user.id)
    .order('created_at', { ascending: false })
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ patients })
}

// POST /api/patients - Create a new patient
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  
  const body = await request.json()
  const { fullName, dateOfBirth, identifier, notes } = body
  
  if (!fullName || !dateOfBirth) {
    return NextResponse.json(
      { error: 'Nombre completo y fecha de nacimiento son requeridos' },
      { status: 400 }
    )
  }
  
  // Insert patient first
  const { data: patient, error } = await supabase
    .from('patients')
    .insert({
      doctor_id: user.id,
      full_name: fullName,
      date_of_birth: dateOfBirth,
      identifier: identifier || null,
      notes: notes || null,
    })
    .select()
    .single()
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch doctor's profile to check if they have a wallet connected
  const { data: profile } = await supabase
    .from('profiles')
    .select('wallet_address')
    .eq('id', user.id)
    .single()

  let arkivEntityId: string | null = null
  let arkivTxHash: string | null = null

  if (isArkivConfigured()) {
    try {
      const arkivResult = await registerPatientOnArkiv(
        patient.id,
        fullName,
        profile?.wallet_address
      )
      arkivEntityId = arkivResult.entityKey
      arkivTxHash = arkivResult.txHash

      // Update patient with arkiv entity ID
      await supabase
        .from('patients')
        .update({ arkiv_entity_id: arkivEntityId })
        .eq('id', patient.id)
    } catch (arkivError) {
      console.error('[Arkiv] Error registering patient:', arkivError)
    }
  }
  
  // Log audit
  await supabase.from('audit_logs').insert({
    action: 'patient_created',
    actor_id: user.id,
    resource_type: 'patient',
    resource_id: patient.id,
    details: { 
      fullName, 
      dateOfBirth,
      arkivEntityId,
      arkivTxHash,
      walletAddress: profile?.wallet_address || null
    },
  })
  
  return NextResponse.json({ 
    patient: { 
      ...patient, 
      arkiv_entity_id: arkivEntityId 
    } 
  }, { status: 201 })
}
