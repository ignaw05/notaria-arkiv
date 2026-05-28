'use client'

import { AlertCircle, CheckCircle2, Shield, ExternalLink, Copy, Check, Database, Blocks, Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'
import { toast } from 'sonner'

interface AuditResultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: {
    valid: boolean
    wasManipulated: boolean
    sessionId: string
    hashes: {
      reconstructed: string
      stored: string
      match: boolean
    }
    arkiv: {
      configured: boolean
      verified: boolean
      entityKey: string | null
      storedHash: string | null
      timestamp: number | null
      blockNumber: number | null
      explorerUrl: string | null
    }
  }
}

export function AuditResultDialog({
  open,
  onOpenChange,
  result,
}: AuditResultDialogProps) {
  const [copied, setCopied] = useState(false)
  const isManipulated = result.wasManipulated

  const copySessionId = async () => {
    try {
      await navigator.clipboard.writeText(result.sessionId)
      setCopied(true)
      toast.success('ID de sesión copiado')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Error al copiar al portapapeles')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden rounded-xl border border-border/80 shadow-2xl">
        {/* Header */}
        <DialogHeader
          className={`flex flex-col gap-1 px-6 py-5 border-b relative overflow-hidden ${
            isManipulated
              ? 'bg-destructive/[0.03] border-destructive/20'
              : 'bg-emerald-500/[0.03] border-emerald-500/20'
          }`}
        >
          {/* Subtle background glow */}
          <div
            className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10 opacity-30 ${
              isManipulated ? 'bg-destructive' : 'bg-emerald-500'
            }`}
          />

          <div className="flex items-center gap-2.5 relative z-10">
            {isManipulated ? (
              <div className="p-1 rounded-md bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              </div>
            ) : (
              <div className="p-1 rounded-md bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
            )}
            <DialogTitle
              className={`text-xl font-bold tracking-tight ${
                isManipulated ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {isManipulated ? 'Datos Manipulados' : 'Conversación Íntegra'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            {isManipulated
              ? 'La firma digital no coincide con el registro original.'
              : 'Prueba criptográfica verificada con éxito.'}
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <ScrollArea className="max-h-[75vh]">
          <div className="p-6 space-y-6">
            {/* Session ID - Plain text with copy button */}
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground/80">Identificador de sesión:</span>
              <code className="text-xs font-mono bg-muted/60 text-foreground px-2 py-0.5 rounded border border-border/40 select-all max-w-[280px] sm:max-w-none truncate">
                {result.sessionId}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={copySessionId}
                title="Copiar ID"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>

            {/* Verification details */}
            {result.arkiv.configured && result.arkiv.entityKey && !result.arkiv.entityKey.startsWith('local_') ? (
              <div className="space-y-3 pt-4 border-t border-border/60">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/90">
                  <Shield className="h-4 w-4 text-primary/80" />
                  Verificación en Blockchain Arkiv
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 border border-border/40 rounded-lg p-4">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Fecha de sellado
                    </span>
                    <span className="text-sm font-medium text-foreground block">
                      {result.arkiv.timestamp
                        ? new Date(result.arkiv.timestamp * 1000).toLocaleString('es-ES', {
                            dateStyle: 'medium',
                            timeStyle: 'medium',
                          })
                        : 'No disponible'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Blocks className="h-3.5 w-3.5" />
                      Entity Key
                    </span>
                    {result.arkiv.explorerUrl ? (
                      <a
                        href={result.arkiv.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline flex items-center gap-1 inline-flex transition-all hover:opacity-85"
                      >
                        <span className="truncate max-w-[180px] font-mono text-xs">{result.arkiv.entityKey}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 text-primary" />
                      </a>
                    ) : (
                      <span className="text-sm font-mono text-foreground block truncate max-w-[200px]">
                        {result.arkiv.entityKey}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-4 border-t border-border/60">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/90">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  Verificación Local
                </h4>
                <div className="bg-muted/30 border border-border/40 rounded-lg p-4 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Los datos de la conversación se validaron localmente contra la base de datos de firmas.
                  </p>
                  {result.arkiv.timestamp && (
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Fecha de registro</span>
                      <span className="text-xs font-medium text-foreground">
                        {new Date(result.arkiv.timestamp * 1000).toLocaleString('es-ES')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Block comparison (hash comparison) */}
            <div className="space-y-3 pt-4 border-t border-border/60">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/90">
                <Blocks className="h-4 w-4 text-muted-foreground" />
                Comparación de Bloques
              </h4>

              <div className="space-y-2.5">
                <div className="bg-muted/30 border border-border/40 rounded-lg p-3.5 space-y-1.5 transition-colors hover:bg-muted/40">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-5 px-1.5 bg-primary/5 text-primary border-primary/20">
                      Blockchain
                    </Badge>
                    <span className="text-xs text-muted-foreground font-medium">Hash sellado inmutable</span>
                  </div>
                  <code className="block text-xs font-mono break-all text-foreground/80 bg-muted/80 px-2.5 py-2 rounded border border-border/40 leading-relaxed selection:bg-primary/20">
                    {result.arkiv.storedHash || result.hashes.stored || 'No disponible'}
                  </code>
                </div>

                <div className="bg-muted/30 border border-border/40 rounded-lg p-3.5 space-y-1.5 transition-colors hover:bg-muted/40">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-5 px-1.5 bg-secondary text-secondary-foreground border-secondary/20">
                      Base de Datos
                    </Badge>
                    <span className="text-xs text-muted-foreground font-medium">Hash reconstruido de datos actuales</span>
                  </div>
                  <code className="block text-xs font-mono break-all text-foreground/80 bg-muted/80 px-2.5 py-2 rounded border border-border/40 leading-relaxed selection:bg-primary/20">
                    {result.hashes.reconstructed}
                  </code>
                </div>
              </div>

              {/* Status Alert */}
              <div className={`p-4 rounded-lg border mt-3 transition-all duration-300 ${
                result.hashes.match
                  ? 'bg-emerald-500/[0.04] border-emerald-500/25 text-emerald-800 dark:text-emerald-300'
                  : 'bg-destructive/[0.04] border-destructive/25 text-destructive dark:text-destructive-foreground'
              }`}>
                <div className="flex items-start gap-3">
                  {result.hashes.match ? (
                    <div className="p-1 rounded bg-emerald-500/10 mt-0.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    </div>
                  ) : (
                    <div className="p-1 rounded bg-destructive/10 mt-0.5">
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    </div>
                  )}
                  <div>
                    <h5 className="text-sm font-semibold tracking-tight">
                      {result.hashes.match ? 'Hashes idénticos — Integridad verificada' : 'Hashes diferentes — Integridad comprometida'}
                    </h5>
                    <p className="text-xs opacity-85 mt-1 leading-relaxed">
                      {result.hashes.match
                        ? 'El contenido actual coincide exactamente con el registro original. Los datos son íntegros y no han sido manipulados.'
                        : 'El contenido actual difiere del registro histórico original. Se detectaron modificaciones no autorizadas.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

