import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionId = (await params).id
  const supabase = await createClient()

  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get session to check doctor ownership
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('doctor_id, summary')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
    }

    if (session.doctor_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get all messages for context
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Error fetching messages for summary:', messagesError)
      return NextResponse.json({ error: 'Error al recuperar mensajes' }, { status: 500 })
    }

    if (!messages || messages.length === 0) {
      // If there are no messages, set summary to a default empty string or generic note
      return NextResponse.json({ summary: '' })
    }

    // Format the conversation history for the prompt
    const conversationText = messages
      .map((m) => `${m.role === 'user' ? 'Médico' : 'Asistente de IA'}: ${m.content}`)
      .join('\n\n')

    // Call Gemini to generate the summary in a single sentence
    const { text: summaryText } = await generateText({
      model: google('gemini-3.1-flash-lite'),
      prompt: `Resume la siguiente conversación clínica entre un Médico y un Asistente de IA en una única oración concisa y muy profesional en español. Debe ser un resumen objetivo del caso clínico analizado. No agregues preámbulos, introducciones ni saludos; responde únicamente con la oración sintetizada.\n\nConversación:\n${conversationText}`,
    })

    const cleanSummary = summaryText.trim()

    // Save summary in database
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ summary: cleanSummary })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Error updating session summary:', updateError)
      return NextResponse.json({ error: 'Error al actualizar el resumen en base de datos' }, { status: 500 })
    }

    return NextResponse.json({ summary: cleanSummary })
  } catch (error) {
    console.error('Error generating summary:', error)
    return NextResponse.json(
      { error: 'Error interno al generar el resumen' },
      { status: 500 }
    )
  }
}
