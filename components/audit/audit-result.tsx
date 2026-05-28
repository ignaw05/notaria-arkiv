'use client'

import { AlertCircle, CheckCircle2, Shield, ExternalLink, Copy, Check, Database, Link2, Hash, Clock, Blocks } from 'lucide-react'
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

export function AuditResult({ result }: AuditResultProps) {
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
  
  const isManipulated = result.wasManipulated
  const hashesMatch = result.hashes.match
  const arkivMatch = result.arkiv.storedHash === result.hashes.reconstructed

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedHash(label)
    toast.success('Copiado al portapapeles')
    setTimeout(() => setCopiedHash(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Session ID */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Identificador de Sesion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted p-3 rounded font-mono text-sm">
              {result.sessionId}
            </code>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => copyToClipboard(result.sessionId, 'sessionId')}
            >
              {copiedHash === 'sessionId' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Status Card */}
      <Card className={isManipulated 
        ? 'border-2 border-destructive bg-destructive/5' 
        : 'border-2 border-green-500 bg-green-500/5'
      }>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className={`h-16 w-16 rounded-full flex items-center justify-center ${isManipulated ? 'bg-destructive/20' : 'bg-green-500/20'}`}>
              {isManipulated ? (
                <AlertCircle className="h-9 w-9 text-destructive" />
              ) : (
                <CheckCircle2 className="h-9 w-9 text-green-600" />
              )}
            </div>
            <div className="flex-1">
              <CardTitle className={`text-2xl ${isManipulated ? 'text-destructive' : 'text-green-600'}`}>
                {isManipulated ? 'DATOS ALTERADOS' : 'INTEGRIDAD VERIFICADA'}
              </CardTitle>
              <CardDescription className={`text-base mt-1 ${isManipulated ? 'text-destructive/80' : 'text-green-600/80'}`}>
                {isManipulated 
                  ? 'Los datos actuales NO coinciden con el registro inmutable en blockchain'
                  : 'Los datos actuales coinciden exactamente con el registro inmutable en blockchain'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Blockchain Verification - La parte mas importante */}
      {result.arkiv.configured && result.arkiv.entityKey && !result.arkiv.entityKey.startsWith('local_') && (
        <Card className="border-2">
          <CardHeader className="bg-muted/50">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Verificacion en Blockchain Arkiv Network
            </CardTitle>
            <CardDescription>
              Prueba criptografica inmutable registrada en la red descentralizada
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Block Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Blocks className="h-4 w-4" />
                  <span className="text-sm font-medium">Bloque</span>
                </div>
                <p className="text-2xl font-bold">#{result.arkiv.blockNumber || 'N/A'}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Sellado en</span>
                </div>
                <p className="text-sm font-medium">
                  {result.arkiv.timestamp 
                    ? new Date(result.arkiv.timestamp * 1000).toLocaleString('es-ES', {
                        dateStyle: 'medium',
                        timeStyle: 'medium'
                      })
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* Entity Key */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Link2 className="h-4 w-4" />
                Entity Key (Identificador en Blockchain)
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted p-3 rounded text-xs break-all font-mono border">
                  {result.arkiv.entityKey}
                </code>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(result.arkiv.entityKey!, 'entityKey')}
                >
                  {copiedHash === 'entityKey' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Hash Comparison with Blockchain */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Comparacion de Hashes
              </h4>
              
              {/* Hash from Blockchain */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/10">BLOCKCHAIN</Badge>
                  <span className="text-sm text-muted-foreground">Hash registrado en Arkiv (inmutable)</span>
                </div>
                <code className="block bg-primary/5 border-2 border-primary/20 p-3 rounded text-xs break-all font-mono">
                  {result.arkiv.storedHash || 'No disponible'}
                </code>
              </div>

              {/* Hash from Current Data */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-secondary">BASE DE DATOS</Badge>
                  <span className="text-sm text-muted-foreground">Hash reconstruido desde datos actuales</span>
                </div>
                <code className="block bg-muted p-3 rounded text-xs break-all font-mono border">
                  {result.hashes.reconstructed}
                </code>
              </div>

              {/* Match Result */}
              <div className={`p-4 rounded-lg border-2 ${arkivMatch 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-500' 
                : 'bg-red-50 dark:bg-red-900/20 border-destructive'}`}
              >
                <div className="flex items-center gap-3">
                  {arkivMatch ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-destructive shrink-0" />
                  )}
                  <div>
                    <p className={`font-semibold ${arkivMatch ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                      {arkivMatch 
                        ? 'HASHES IDENTICOS - Datos no manipulados'
                        : 'HASHES DIFERENTES - Datos alterados'}
                    </p>
                    <p className={`text-sm mt-1 ${arkivMatch ? 'text-green-600/80 dark:text-green-400/80' : 'text-red-600/80 dark:text-red-400/80'}`}>
                      {arkivMatch 
                        ? 'El contenido actual de la conversacion coincide exactamente con lo registrado en blockchain. Es matematicamente imposible que haya sido alterado.'
                        : 'El contenido actual difiere del registro en blockchain. Los datos fueron modificados despues del sellado.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Explorer Link */}
            {result.arkiv.explorerUrl && (
              <Button
                variant="default"
                size="lg"
                asChild
                className="w-full"
              >
                <a href={result.arkiv.explorerUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Verificar en Arkiv Explorer
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fallback for local storage */}
      {(!result.arkiv.configured || result.arkiv.entityKey?.startsWith('local_')) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Verificacion Local
            </CardTitle>
            <CardDescription>
              Hash almacenado en base de datos (sin registro en blockchain)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Hash Actual (reconstruido):</p>
              <code className="block bg-muted p-3 rounded text-xs break-all font-mono border">
                {result.hashes.reconstructed}
              </code>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Hash Guardado (sellado):</p>
              <code className="block bg-muted p-3 rounded text-xs break-all font-mono border">
                {result.hashes.stored}
              </code>
            </div>

            <div className={`p-4 rounded-lg ${hashesMatch 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}
            >
              <p className={`text-sm font-medium ${hashesMatch ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                {hashesMatch 
                  ? 'Los hashes coinciden - Datos integros'
                  : 'Los hashes NO coinciden - Datos alterados'}
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Nota:</strong> Para obtener verificacion inmutable en blockchain, configura la variable ARKIV_PRIVATE_KEY.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
