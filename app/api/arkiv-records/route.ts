import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { queryArkivSessionsByDoctor, queryArkivPatients, getArkivExplorerUrl } from '@/lib/arkiv'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 1. Fetch doctor's profile to get wallet address
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_address')
      .eq('id', user.id)
      .single()

    // 2. Fetch on-chain sessions for this doctor
    const arkivSessions = await queryArkivSessionsByDoctor(user.id)
    
    // 3. Fetch all on-chain patients
    const arkivPatients = await queryArkivPatients()
    
    // 3. Fetch doctor's patients from database to filter and match names
    const { data: dbPatients, error: dbPatientsError } = await supabase
      .from('patients')
      .select('id, full_name, identifier, arkiv_entity_id, created_at')
      .eq('doctor_id', user.id)

    if (dbPatientsError) {
      console.error('Error fetching database patients:', dbPatientsError)
    }

    const doctorPatientIds = new Set(dbPatients?.map(p => p.id) || [])
    const doctorWalletLower = profile?.wallet_address?.toLowerCase() || ''

    // Filter on-chain patients to only those belonging to this doctor and owned by their connected wallet, and correlate data
    const correlatedPatients = arkivPatients
      .filter(ap => {
        const belongsToDoctor = doctorPatientIds.has(ap.payload.patientId)
        const isOwnedByWallet = doctorWalletLower && ap.owner?.toLowerCase() === doctorWalletLower
        return belongsToDoctor && isOwnedByWallet
      })
      .map(ap => {
        const dbPatient = dbPatients?.find(p => p.id === ap.payload.patientId)
        return {
          id: ap.payload.patientId,
          name: ap.payload.name || dbPatient?.full_name || 'Paciente sin nombre',
          entityKey: ap.key,
          owner: ap.owner,
          creator: ap.creator,
          explorerUrl: getArkivExplorerUrl(ap.key),
          registeredAt: dbPatient?.created_at || null,
          identifier: dbPatient?.identifier || null,
          isVerifiedOnChain: ap.key === dbPatient?.arkiv_entity_id,
        }
      })

    // 4. Fetch doctor's sessions from database to match details
    const { data: dbSessions, error: dbSessionsError } = await supabase
      .from('sessions')
      .select('id, title, is_active, session_hash, closed_at, patient_id, patients(full_name)')
      .eq('doctor_id', user.id)

    if (dbSessionsError) {
      console.error('Error fetching database sessions:', dbSessionsError)
    }

    // Filter on-chain sessions by owner wallet, and correlate with database session details
    const correlatedSessions = arkivSessions
      .filter(as => doctorWalletLower && as.owner?.toLowerCase() === doctorWalletLower)
      .map(as => {
        const dbSession = dbSessions?.find(s => s.id === as.payload.sessionId)
        return {
          id: as.payload.sessionId,
          title: dbSession?.title || 'Sesión Clínica',
          patientId: as.payload.patientId,
          patientName: dbSession?.patients?.full_name || 'Paciente Desconocido',
          hash: as.payload.hash,
          entityKey: as.key,
          owner: as.owner,
          creator: as.creator,
          explorerUrl: getArkivExplorerUrl(as.key),
          messageCount: as.payload.messageCount || 0,
          sealedAt: as.payload.sealedAt || dbSession?.closed_at || null,
          isVerifiedOnChain: dbSession ? dbSession.session_hash === as.payload.hash : false,
        }
      })

    return NextResponse.json({
      sessions: correlatedSessions,
      patients: correlatedPatients,
      doctorWallet: profile?.wallet_address || null,
    })
  } catch (error) {
    console.error('Error in /api/arkiv-records:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
