'use client'

import { AlertCircle, CheckCircle2, Shield, AlertTriangle, ExternalLink, Copy, Check } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useState } from 'react'
import { toast } from 'sonner'

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
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
  
  // Usar directamente wasManipulated del API - es la fuente de verdad
  // wasManipulated = true si los hashes NO coinciden O si la cadena esta rota
  const isManipulated = result.wasManipulated
  const hashesMatch = result.hashes.match

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedHash(label)
    toast.success('Hash copiado al portapapeles')
    setTimeout(() => setCopiedHash(null), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Main Status Card - Grande y claro */}
      <Card className={isManipulated 
        ? 'border-2 border-destructive bg-destructive/10' 
        : 'border-2 border-green-500 bg-green-500/10'
      }>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            {isManipulated ? (
              <>
                <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center">
                  <AlertCircle className="h-7 w-7 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-xl text-destructive">INTEGRIDAD COMPROMETIDA</CardTitle>
                  <CardDescription className="text-destructive/80">
                    {!hashesMatch 
                      ? 'Los hashes NO coinciden - se detectaron cambios en los mensajes'
                      : 'La cadena de hashes esta rota - posible manipulacion de mensajes individuales'}
                  </CardDescription>
                </div>
              </>
            ) : (
              <>
                <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-green-600">CONVERSACION INTEGRA</CardTitle>
                  <CardDescription className="text-green-600/80">
                    Los hashes coinciden y la cadena esta intacta - no hubo manipulacion
                  </CardDescription>
                </div>
              </>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Explicacion de la logica */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Como funciona la verificacion</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Al sellar la sesion, se genera un hash SHA-256 de todos los mensajes. 
            Este hash se guarda en la base de datos y se registra en Arkiv Network (blockchain).
          </p>
          <p className="mt-2">
            Al auditar, reconstruimos el hash desde los mensajes actuales y lo comparamos:
          </p>
          <ul className="mt-2 list-disc list-inside space-y-1">
            <li><strong>Si coinciden:</strong> La conversacion no fue alterada</li>
            <li><strong>Si no coinciden:</strong> Alguien modifico los mensajes despues del sellado</li>
          </ul>
        </CardContent>
      </Card>

      {/* Hash Comparison - La parte mas importante */}
      <Card className={!hashesMatch ? 'border-destructive' : ''}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Comparacion de Hashes
            <Badge variant={hashesMatch ? 'default' : 'destructive'} className="ml-auto">
              {hashesMatch ? 'COINCIDEN' : 'NO COINCIDEN'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Hash Reconstructed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Hash Actual (reconstruido desde mensajes):</p>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => copyToClipboard(result.hashes.reconstructed, 'reconstructed')}
              >
                {copiedHash === 'reconstructed' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
            <code className="block bg-muted p-3 rounded text-xs break-all font-mono border">
              {result.hashes.reconstructed}
            </code>
          </div>

          <Separator />
          
          {/* Hash Stored */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Hash Guardado (al momento del sellado):</p>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => copyToClipboard(result.hashes.stored, 'stored')}
              >
                {copiedHash === 'stored' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
            <code className="block bg-muted p-3 rounded text-xs break-all font-mono border">
              {result.hashes.stored}
            </code>
          </div>

          {/* Visual comparison */}
          <div className={`p-4 rounded-lg ${hashesMatch ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
            <p className={`text-sm font-medium ${hashesMatch ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
              {hashesMatch 
                ? '✓ Los hashes de sesion son identicos'
                : '✗ Los hashes de sesion son diferentes - contenido modificado'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Chain Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verificacion de Cadena de Mensajes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Hash de Sesion</p>
              <Badge variant={result.verification.sessionHashValid ? 'default' : 'destructive'}>
                {result.verification.sessionHashValid ? 'Valido' : 'Invalido'}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Cadena de Hashes</p>
              <Badge variant={result.verification.chainValid ? 'default' : 'destructive'}>
                {result.verification.chainValid ? 'Integra' : 'Rota'}
              </Badge>
            </div>
          </div>

          {result.verification.brokenAt && (
            <div className="bg-destructive/10 border border-destructive/30 rounded p-3">
              <p className="text-sm text-destructive">
                <AlertTriangle className="inline h-4 w-4 mr-2" />
                <strong>Ruptura detectada en:</strong> {result.verification.brokenAt}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Arkiv Network Verification */}
      {result.arkiv.configured && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Registro en Arkiv Network (Blockchain)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Estado Arkiv</p>
                <Badge variant={result.arkiv.verified ? 'default' : 'secondary'}>
                  {result.arkiv.verified ? 'Verificado en Blockchain' : 'No verificado'}
                </Badge>
              </div>
              {result.arkiv.blockNumber && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Numero de Bloque</p>
                  <Badge variant="outline">#{result.arkiv.blockNumber}</Badge>
                </div>
              )}
            </div>

            {result.arkiv.timestamp && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Timestamp del Bloque</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(result.arkiv.timestamp * 1000).toLocaleString()}
                </p>
              </div>
            )}

            {result.arkiv.entityKey && !result.arkiv.entityKey.startsWith('local_') && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Entity Key:</p>
                <code className="block bg-muted p-2 rounded text-xs break-all font-mono">
                  {result.arkiv.entityKey}
                </code>
                
                {result.arkiv.storedHash && (
                  <>
                    <p className="text-sm font-medium mt-3">Hash en Blockchain:</p>
                    <code className="block bg-muted p-2 rounded text-xs break-all font-mono">
                      {result.arkiv.storedHash}
                    </code>
                  </>
                )}

                {result.arkiv.explorerUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="w-full mt-2"
                  >
                    <a href={result.arkiv.explorerUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver en Arkiv Explorer
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
