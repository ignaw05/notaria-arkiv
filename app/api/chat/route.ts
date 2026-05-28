import { streamText, generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

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
    const { messages, sessionId } = await req.json()

    // Verify authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Verify session ownership
    if (sessionId) {
      const { data: session } = await supabase
        .from('sessions')
        .select('doctor_id')
        .eq('id', sessionId)
        .single()

      if (!session || session.doctor_id !== user.id) {
        return new Response('Unauthorized', { status: 401 })
      }
    }

    // Generate AI response with clinical assessment
    const result = await generateObject({
      model: anthropic('claude-sonnet-4-20250514'),
      system: CLINICAL_SYSTEM_PROMPT,
      messages: messages.map((m: { role: string; content: string }) => ({
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

    // Log to audit
    await supabase.from('audit_logs').insert({
      action: 'ai_response_generated',
      actor_id: user.id,
      resource_type: 'session',
      resource_id: sessionId,
      details: {
        model: 'claude-sonnet-4-20250514',
        riskLevel: result.object.riskLevel,
        confidenceScore: result.object.confidenceScore,
      },
    })

    return Response.json({
      content: result.object.content,
      riskLevel: result.object.riskLevel,
      confidenceScore: result.object.confidenceScore,
      reasoning: result.object.reasoning,
      model: 'claude-sonnet-4-20250514',
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
