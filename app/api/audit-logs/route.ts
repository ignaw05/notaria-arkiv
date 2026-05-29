import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')
    const resourceType = searchParams.get('resource_type')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const offset = (page - 1) * limit

    // Start building query
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('actor_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (action) {
      query = query.eq('action', action)
    }

    if (resourceType) {
      query = query.eq('resource_type', resourceType)
    }

    if (fromDate) {
      query = query.gte('created_at', fromDate)
    }

    if (toDate) {
      query = query.lte('created_at', toDate)
    }

    const { data: logs, count, error } = await query

    if (error) {
      console.error('Error fetching audit logs:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      logs: logs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Error in /api/audit-logs:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
