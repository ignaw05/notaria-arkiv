'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, AlertCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center justify-center gap-3 mb-4">
            <img src="/logo.png" alt="NotarIA Logo" className="h-16 w-16 object-contain" />
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">NotarIA</h1>
          </div>
          <p className="text-muted-foreground">
            Testigo Clínico Arkiv
          </p>
        </div>

        <div className="bg-blue-50/80 border border-blue-100 text-blue-800 rounded-xl p-4 mb-6 text-sm text-center font-medium shadow-sm leading-relaxed">
          💡 <strong>Demo Hackathon PunaTech:</strong> Usar esta cuenta de prueba para ingresar:<br />
          <div className="mt-1.5 font-mono bg-blue-100/50 py-1.5 px-3 rounded-lg border border-blue-200 inline-flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
            <span>Usuario: <strong className="select-all">admin@example.com</strong></span>
            <span className="text-blue-300 hidden sm:inline">|</span>
            <span>Clave: <strong className="select-all">admin1234</strong></span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bienvenido de Vuelta</CardTitle>
            <CardDescription>
              Inicia sesión para acceder a tu asistente clínico de IA
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="doctor@hospital.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar sesión'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Todas las interacciones clínicas se registran con registros de auditoría inmutables
        </p>
      </div>
    </div>
  )
}
