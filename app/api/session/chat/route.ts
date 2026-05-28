import { generateObject } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})
import { createClient } from '@/lib/supabase/server'
import { generateMessageHash } from '@/lib/crypto'

function buildSystemPrompt(patientContext: string | null) {
  const basePrompt = `Eres un asistente clinico de IA disenado para apoyar a profesionales de la salud con orientacion basada en evidencia. Tu rol es:

1. Proporcionar soporte en decisiones clinicas basado en guias medicas establecidas
2. Ayudar a analizar sintomas del paciente y sugerir diagnosticos diferenciales
3. Recomendar pruebas diagnosticas apropiadas y consideraciones de tratamiento
4. Senalar potenciales interacciones medicamentosas o contraindicaciones
5. Sugerir guias clinicas relevantes y mejores practicas

LINEAMIENTOS IMPORTANTES:
- Siempre enfatiza que las decisiones clinicas finales recaen en el medico tratante
- Cita guias medicas relevantes cuando sea aplicable
- Senala claramente situaciones de alto riesgo
- Nunca proporciones dosificaciones especificas sin verificacion
- Recomienda consulta con especialistas cuando sea apropiado
- Mantén la confidencialidad del paciente en todo momento

Para cada respuesta, evalua internamente:
- Nivel de Riesgo: bajo, medio, alto o critico basado en urgencia clinica
- Puntuacion de Confianza: tu confianza en la recomendacion (0-1)

Formatea tus respuestas de manera clara y profesional para documentacion clinica.
Responde siempre en espanol.`

  if (patientContext) {
    return `${basePrompt}

CONTEXTO DEL PACIENTE:
${patientContext}

Usa esta informacion del paciente para contextualizar tus respuestas y recomendaciones.`
  }

  return basePrompt
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birth = new Date(dateOfBirth)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

export async function POST(req: Request) {
  try {
    const { sessionId, prompt } = await req.json()

    if (!sessionId || !prompt) {
      return Response.json({ error: 'sessionId y prompt son requeridos' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get session with patient info
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        *,
        patients (
          id,
          full_name,
          date_of_birth,
          notes
        )
      `)
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return Response.json({ error: 'Sesion no encontrada' }, { status: 404 })
    }

    if (session.doctor_id !== user.id) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!session.is_active) {
      return Response.json({ error: 'La sesion esta sellada y no puede recibir nuevos mensajes' }, { status: 400 })
    }

    // Build patient context with medical history
    let patientContext: string | null = null
    if (session.patient_id && session.patients) {
      const patient = session.patients as { id: string; full_name: string; date_of_birth: string; notes: string | null }
      const age = calculateAge(patient.date_of_birth)

      // Get medical history
      const { data: history } = await supabase
        .from('medical_history')
        .select('entry_date, description, category')
        .eq('patient_id', session.patient_id)
        .order('entry_date', { ascending: false })

      const historyText = history?.map(h => 
        `- [${h.entry_date}] (${h.category || 'general'}): ${h.description}`
      ).join('\n') || 'Sin historial medico registrado'

      patientContext = `Paciente: ${patient.full_name}
Edad: ${age} años (Nacimiento: ${patient.date_of_birth})
${patient.notes ? `Notas: ${patient.notes}` : ''}

HISTORIAL MEDICO:
${historyText}`
    }

    // Get last message hash for chain
    const { data: lastMessage } = await supabase
      .from('messages')
      .select('hash')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const previousHash = lastMessage?.hash || null

    // Generate hash for user message
    const userTimestamp = new Date().toISOString()
    const userHash = await generateMessageHash(prompt, 'user', userTimestamp, previousHash)

    // Save user message
    const { data: userMessage, error: userMsgError } = await supabase
      .from('messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content: prompt,
        hash: userHash,
        previous_hash: previousHash,
        created_at: userTimestamp,
      })
      .select()
      .single()

    if (userMsgError) {
      console.error('Error saving user message:', userMsgError)
      return Response.json({ error: 'Error al guardar mensaje' }, { status: 500 })
    }

    // Get all messages for context
    const { data: allMessages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    // Generate AI response with patient context
    const result = await generateObject({
      model: google('gemini-2.0-flash-001'),
      system: buildSystemPrompt(patientContext),
      messages: (allMessages || []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      schema: z.object({
        content: z.string().describe('La respuesta clinica al usuario'),
        riskLevel: z.enum(['low', 'medium', 'high', 'critical']).describe('Evaluacion de riesgo clinico'),
        confidenceScore: z.number().min(0).max(1).describe('Confianza en la recomendacion'),
        reasoning: z.string().describe('Razonamiento interno para propositos de auditoria'),
      }),
    })

    // Generate hash for AI response
    const aiTimestamp = new Date().toISOString()
    const aiHash = await generateMessageHash(result.object.content, 'assistant', aiTimestamp, userHash)

    // Save AI response
    const { data: aiMessage, error: aiMsgError } = await supabase
      .from('messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: result.object.content,
        hash: aiHash,
        previous_hash: userHash,
        model: 'gemini-2.0-flash-001',
        confidence_score: result.object.confidenceScore,
        risk_level: result.object.riskLevel,
        metadata: { reasoning: result.object.reasoning },
        created_at: aiTimestamp,
      })
      .select()
      .single()

    if (aiMsgError) {
      console.error('Error saving AI message:', aiMsgError)
      return Response.json({ error: 'Error al guardar respuesta de IA' }, { status: 500 })
    }

    // Log to audit
    await supabase.from('audit_logs').insert({
      action: 'message_exchange',
      actor_id: user.id,
      resource_type: 'session',
      resource_id: sessionId,
      details: {
        userMessageId: userMessage.id,
        aiMessageId: aiMessage.id,
        model: 'gemini-2.0-flash-001',
        riskLevel: result.object.riskLevel,
        confidenceScore: result.object.confidenceScore,
        patientId: session.patient_id,
      },
    })

    return Response.json({
      userMessage: {
        id: userMessage.id,
        content: prompt,
        hash: userHash,
        timestamp: userTimestamp,
      },
      aiMessage: {
        id: aiMessage.id,
        content: result.object.content,
        hash: aiHash,
        timestamp: aiTimestamp,
        riskLevel: result.object.riskLevel,
        confidenceScore: result.object.confidenceScore,
        model: 'gemini-2.0-flash-001',
      },
    })
  } catch (error) {
    console.error('[v0] Chat API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return Response.json({ error: 'Error interno del servidor', details: errorMessage }, { status: 500 })
  }
}
