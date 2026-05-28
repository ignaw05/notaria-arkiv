'use client'

import { AlertCircle, CheckCircle2, Shield, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'

interface AuditResultProps {
  result: {
    valid: boolean
    wasManipulated: boolean
    verification: {
      sessionHashValid: boolean
      chainValid: boolean
      brokenAt?: string
    }
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

export function AuditResult({ result }: AuditResultProps) {
  const isValid = result.valid && !result.wasManipulated
  const isManipulated = result.wasManipulated

  return (
    <div className="space-y-4">
      {/* Main Status Card */}
      <Card className={isManipulated ? 'border-destructive bg-destructive/5' : 'border-success bg-success/5'}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            {isManipulated ? (
              <>
                <AlertCircle className="h-6 w-6 text-destructive" />
                <div>
                  <CardTitle className="text-destructive">⚠️ CONVERSACIÓN MANIPULADA</CardTitle>
                  <CardDescription>Se detectaron cambios no autorizados en los mensajes</CardDescription>
                </div>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-6 w-6 text-success" />
                <div>
                  <CardTitle className="text-success">✓ CONVERSACIÓN VÁLIDA</CardTitle>
                  <CardDescription>La integridad de los mensajes ha sido verificada</CardDescription>
                </div>
              </>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Verification Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Detalles de Verificación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Hash de Sesión</p>
              <Badge variant={result.verification.sessionHashValid ? 'default' : 'destructive'}>
                {result.verification.sessionHashValid ? 'Válido' : 'Inválido'}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Cadena de Hashes</p>
              <Badge variant={result.verification.chainValid ? 'default' : 'destructive'}>
                {result.verification.chainValid ? 'Íntegra' : 'Rota'}
              </Badge>
            </div>
          </div>

          {result.verification.brokenAt && (
            <div className="bg-destructive/10 border border-destructive/30 rounded p-3">
              <p className="text-sm text-destructive">
                <strong>Ruptura detectada:</strong> {result.verification.brokenAt}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hash Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparación de Hashes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Hash Reconstructido (Actual):</p>
            <code className="block bg-muted p-2 rounded text-xs break-all font-mono">
              {result.hashes.reconstructed}
            </code>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Hash Almacenado (Sellado):</p>
            <code className="block bg-muted p-2 rounded text-xs break-all font-mono">
              {result.hashes.stored}
            </code>
          </div>
          <div className="pt-2">
            <Badge variant={result.hashes.match ? 'default' : 'destructive'}>
              {result.hashes.match ? '✓ Coinciden' : '✗ No coinciden'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Arkiv Network Verification */}
      {result.arkiv.configured && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Verificación Arkiv Network
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Estado Arkiv</p>
                <Badge variant={result.arkiv.verified ? 'default' : 'secondary'}>
                  {result.arkiv.verified ? 'Verificado' : 'No verificado'}
                </Badge>
              </div>
              {result.arkiv.blockNumber && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Bloque</p>
                  <Badge variant="outline">#{result.arkiv.blockNumber}</Badge>
                </div>
              )}
            </div>

            {result.arkiv.entityKey && !result.arkiv.entityKey.startsWith('local_') && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Entity Key:</p>
                <code className="block bg-muted p-2 rounded text-xs break-all font-mono">
                  {result.arkiv.entityKey}
                </code>
                {result.arkiv.explorerUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="w-full"
                  >
                    <a href={result.arkiv.explorerUrl} target="_blank" rel="noopener noreferrer">
                      Ver en Arkiv Explorer →
                    </a>
                  </Button>
                )}
              </div>
            )}

            {result.arkiv.entityKey?.startsWith('local_') && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <AlertTriangle className="inline h-4 w-4 mr-2" />
                  Hash almacenado localmente. Configura ARKIV_PRIVATE_KEY para registrar en blockchain.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
