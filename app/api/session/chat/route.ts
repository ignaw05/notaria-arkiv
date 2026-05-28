import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateMessageHash } from '@/lib/crypto'

const CLINICAL_SYSTEM_PROMPT = `You are a clinical AI assistant designed to support healthcare professionals with evidence-based guidance. Your role is to:

1. Provide clinical decision support based on established medical guidelines
2. Help analyze patient symptoms and suggest differential diagnoses
3. Recommend appropriate diagnostic tests and treatment considerations
4. Flag potential drug interactions or contraindications
5. Suggest relevant clinical guidelines and best practices

IMPORTANT GUIDELINES:
- Always emphasize that final clinical decisions rest with the treating physician
- Cite relevant medical guidelines when applicable
- Flag high-risk situations clearly
- Never provide specific dosing without verification
- Recommend consultation with specialists when appropriate
- Maintain patient confidentiality at all times

For each response, internally assess:
- Risk Level: low, medium, high, or critical based on clinical urgency
- Confidence Score: your confidence in the recommendation (0-1)

Format your responses clearly and professionally for clinical documentation.`

export async function POST(req: Request) {
  try {
    const { sessionId, prompt } = await req.json()

    if (!sessionId || !prompt) {
      return Response.json({ error: 'sessionId and prompt are required' }, { status: 400 })
    }

    // Verify authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify session exists and belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return Response.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.doctor_id !== user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.is_active) {
      return Response.json({ error: 'Session is sealed and cannot receive new messages' }, { status: 400 })
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
      return Response.json({ error: 'Failed to save message' }, { status: 500 })
    }

    // Get all messages for context
    const { data: allMessages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    // Generate AI response
    const result = await generateObject({
      model: google('gemini-2.0-flash-001'),
      system: CLINICAL_SYSTEM_PROMPT,
      messages: (allMessages || []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      schema: z.object({
        content: z.string().describe('The clinical response to the user'),
        riskLevel: z.enum(['low', 'medium', 'high', 'critical']).describe('Clinical risk assessment'),
        confidenceScore: z.number().min(0).max(1).describe('Confidence in the recommendation'),
        reasoning: z.string().describe('Internal reasoning for audit purposes'),
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
      return Response.json({ error: 'Failed to save AI response' }, { status: 500 })
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
    console.error('Chat API error:', error)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
