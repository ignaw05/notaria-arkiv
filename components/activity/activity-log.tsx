'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ScrollText, 
  Search, 
  Info, 
  Calendar, 
  RefreshCw, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Lock
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'

interface AuditLog {
  id: string
  action: string
  actor_id: string
  resource_type: string
  resource_id: string
  details: any
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export function ActivityLog() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [resourceFilter, setResourceFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  // Selected Log for detail modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      let url = `/api/audit-logs?page=${page}&limit=10`
      if (actionFilter !== 'all') {
        url += `&action=${actionFilter}`
      }
      if (resourceFilter !== 'all') {
        url += `&resource_type=${resourceFilter}`
      }

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Error al obtener el historial de actividad')
      }
      const data = await response.json()
      setLogs(data.logs || [])
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, pages: 0 })
    } catch (err: any) {
      setError(err.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page, actionFilter, resourceFilter])

  const handleFilterChange = (type: 'action' | 'resource', value: string) => {
    if (type === 'action') setActionFilter(value)
    if (type === 'resource') setResourceFilter(value)
    setPage(1) // Reset to first page
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'session_sealed':
        return (
          <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400 gap-1 font-normal">
            <Lock className="w-3.5 h-3.5" />
            Sesión Sellada
          </Badge>
        )
      case 'patient_created':
        return (
          <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400 gap-1 font-normal">
            <UserPlus className="w-3.5 h-3.5" />
            Paciente Registrado
          </Badge>
        )
      case 'session_audit_verified':
        return (
          <Badge className="bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400 gap-1 font-normal">
            <ShieldCheck className="w-3.5 h-3.5" />
            Auditoría Verificada
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="gap-1 font-normal">
            <Info className="w-3.5 h-3.5" />
            {action.replace(/_/g, ' ')}
          </Badge>
        )
    }
  }

  const getResourceBadge = (resourceType: string) => {
    switch (resourceType) {
      case 'session':
        return <Badge variant="secondary" className="text-xs">Consulta</Badge>
      case 'patient':
        return <Badge variant="secondary" className="text-xs">Paciente</Badge>
      default:
        return <Badge variant="outline" className="text-xs">{resourceType}</Badge>
    }
  }

  const formatDetailValue = (key: string, value: any) => {
    if (value === null || value === undefined) return 'N/A'
    if (typeof value === 'boolean') return value ? 'Sí' : 'No'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    if (key.toLowerCase().includes('hash') || key === 'arkivEntityKey') {
      return <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono break-all">{value}</code>
    }
    return String(value)
  }

  const renderDetails = (details: any) => {
    if (!details) return <p className="text-muted-foreground italic text-xs">No hay detalles adicionales.</p>

    // Specific user-friendly views based on action type
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground border-b pb-1">Metadatos del Evento</h4>
        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
          {Object.entries(details).map(([key, val]) => (
            <div key={key} className="flex flex-col gap-1 border-b border-border/40 pb-2 text-xs">
              <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</span>
              <span className="text-foreground">{formatDetailValue(key, val)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Bitácora de Actividad (Audit Log)</h1>
          <p className="text-muted-foreground text-sm">
            Registro cronológico e inmutable de tus interacciones y notarizaciones en el sistema.
          </p>
        </div>
        <Button onClick={fetchLogs} variant="outline" size="sm" className="h-9 shrink-0 gap-1.5">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5 text-destructive-foreground">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 text-destructive shrink-0" />
            <div>
              <p className="font-semibold text-sm">Error al cargar bitácora</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1 min-w-[150px]">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-0.5">Acción</span>
          <Select value={actionFilter} onValueChange={(val) => handleFilterChange('action', val)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todas las acciones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las acciones</SelectItem>
              <SelectItem value="session_sealed">Sesión Sellada</SelectItem>
              <SelectItem value="patient_created">Paciente Registrado</SelectItem>
              <SelectItem value="session_audit_verified">Auditoría Verificada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1 min-w-[150px]">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-0.5">Recurso</span>
          <Select value={resourceFilter} onValueChange={(val) => handleFilterChange('resource', val)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todos los recursos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los recursos</SelectItem>
              <SelectItem value="session">Consulta</SelectItem>
              <SelectItem value="patient">Paciente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[180px]">Fecha</TableHead>
                <TableHead className="w-[180px]">Acción</TableHead>
                <TableHead className="w-[120px]">Recurso</TableHead>
                <TableHead className="w-[140px]">ID de Recurso</TableHead>
                <TableHead className="text-right">Detalles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20 font-mono" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    <ScrollText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="font-semibold text-sm">No se registraron actividades</p>
                    <p className="text-xs">No hay registros de auditoría que coincidan con los filtros aplicados.</p>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">
                          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </span>
                        <span>
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>{getResourceBadge(log.resource_type)}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      #{log.resource_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSelectedLog(log)}
                        className="h-8 gap-1.5 text-xs text-primary hover:text-primary hover:bg-primary/5"
                      >
                        <Info className="w-3.5 h-3.5" />
                        Ver Detalles
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {pagination.pages > 1 && (
        <div className="flex justify-between items-center bg-muted/20 px-4 py-3 rounded-lg border">
          <span className="text-xs text-muted-foreground">
            Mostrando página {pagination.page} de {pagination.pages} ({pagination.total} registros en total)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
              className="h-8 gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.pages || loading}
              onClick={() => setPage(page + 1)}
              className="h-8 gap-1"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={selectedLog !== null} onOpenChange={(open) => !open && setSelectedLog(null)}>
        {selectedLog && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <ScrollText className="w-5 h-5 text-primary" />
                Detalle del Registro de Auditoría
              </DialogTitle>
              <DialogDescription className="text-xs">
                ID de Registro: <span className="font-mono font-bold text-foreground">{selectedLog.id}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-muted-foreground font-semibold mb-0.5">Acción realizada</p>
                  <div>{getActionBadge(selectedLog.action)}</div>
                </div>
                <div>
                  <p className="text-muted-foreground font-semibold mb-0.5">Tipo de recurso</p>
                  <div>{getResourceBadge(selectedLog.resource_type)}</div>
                </div>
                <div>
                  <p className="text-muted-foreground font-semibold mb-0.5">Fecha del evento</p>
                  <p className="font-medium text-foreground">{format(new Date(selectedLog.created_at), "d 'de' MMMM yyyy, HH:mm:ss", { locale: es })}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-semibold mb-0.5">Dirección IP origen</p>
                  <p className="font-mono text-foreground">{selectedLog.ip_address || 'Local / Interna'}</p>
                </div>
              </div>

              {/* Display dynamic details payload */}
              <div className="bg-muted/40 p-3 rounded-lg border border-border/50">
                {renderDetails(selectedLog.details)}
              </div>

              {selectedLog.user_agent && (
                <div className="text-[10px] text-muted-foreground leading-normal bg-muted/20 p-2 rounded">
                  <p className="font-semibold mb-0.5">Agente de Usuario (Browser):</p>
                  <p className="line-clamp-2 italic font-mono">{selectedLog.user_agent}</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end pt-2">
              <Button onClick={() => setSelectedLog(null)} size="sm">Cerrar</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
