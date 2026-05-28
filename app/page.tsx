import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  MessageSquare,
  Lock,
  FileCheck,
  Users,
  ArrowRight,
  Fingerprint,
  Clock,
} from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">NotarIA</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Inicia sesión</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/sign-up">Comenzar</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
        <Badge variant="secondary" className="mb-4">
          Testigo Clínico Arkiv
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 text-balance">
          Soporte de Decisiones Clínicas Impulsado por IA con Registros de Auditoría Inmutables
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty">
          NotarIA proporciona a los profesionales de la salud asistencia clínica inteligente mientras 
          mantiene la integridad completa de auditoría mediante cadenas de hash criptográficas. Cada interacción 
          se registra, verifica y es a prueba de manipulación.
        </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/auth/sign-up">
                Iniciar Sesión Clínica
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/auth/login">Ver Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-center mb-12">
            Construido para el Cumplimiento Sanitario
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={MessageSquare}
              title="Asistente Clínico IA"
              description="Obten soporte de decisiones clínicas basadas en evidencia impulsado por IA avanzada, con evaluación de riesgo en tiempo real y puntuación de confianza."
            />
            <FeatureCard
              icon={Fingerprint}
              title="Integridad Criptográfica"
              description="Cada mensaje se hashea criptográficamente y se encadena, creando un registro de auditoría inmutable que prueba la integridad de los datos."
            />
            <FeatureCard
              icon={FileCheck}
              title="Listo para Cumplimiento"
              description="Diseñado específicamente para regulaciones sanitarias. Registros de auditoría completos, acceso basado en roles e historiales de sesión verificados."
            />
            <FeatureCard
              icon={Lock}
              title="Privacidad del Paciente"
              description="Los identificadores de pacientes se anonimiza automáticamente utilizando hash criptográfico. Nunca se almacena información de salud protegida en texto plano."
            />
            <FeatureCard
              icon={Users}
              title="Acceso Basado en Roles"
              description="Médicos, auditores y funcionarios de cumplimiento tienen interfaces adaptadas diseñadas para sus flujos de trabajo específicos."
            />
            <FeatureCard
              icon={Clock}
              title="Verificación en Tiempo Real"
              description="Los auditores pueden verificar cualquier sesión en tiempo real, confirmando la cadena de hash completa desde el primer mensaje hasta el último."
            />
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-center mb-12">Cómo Funciona</h2>
          <div className="space-y-8">
            <StepCard
              number={1}
              title="Iniciar una Sesión Clínica"
              description="Ingresa un identificador de paciente anonimizado para comenzar. El sistema crea una nueva sesión auditable con una cadena criptográfica única."
            />
            <StepCard
              number={2}
              title="Consultar con IA"
              description="Describe la situación clínica y recibe recomendaciones impulsadas por IA con evaluaciones de riesgo y puntuaciones de confianza."
            />
            <StepCard
              number={3}
              title="Cada Mensaje se Sella"
              description="Cada mensaje se hashea con SHA-256 y se vincula al hash anterior, creando una cadena de custodia inquebrantable."
            />
            <StepCard
              number={4}
              title="Verifica en Cualquier Momento"
              description="Los auditores pueden verificar criptográficamente cualquier sesión, probando que ningún dato ha sido modificado desde su creación."
            />
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold mb-4">
            ¿Listo para Mejorar tu Flujo de Trabajo Clínico?
          </h2>
          <p className="mb-8 opacity-90">
            Únete a profesionales de la salud que confían en NotarIA para soporte clínico asistido por IA conforme.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/auth/sign-up">
              Crear tu Cuenta
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold">NotarIA</span>
            <span className="text-muted-foreground">by Arkiv Network</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Asistencia Clínica de IA con registros de auditoría inmutables. Construido para cumplimiento sanitario.
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <Card>
      <CardHeader>
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardContent>
    </Card>
  )
}

function StepCard({
  number,
  title,
  description,
}: {
  number: number
  title: string
  description: string
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
        {number}
      </div>
      <div>
        <h3 className="font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
