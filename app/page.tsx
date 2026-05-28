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
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/sign-up">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-4">
            Arkiv Clinical Witness
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 text-balance">
            AI-Powered Clinical Decision Support with Immutable Audit Trails
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty">
            NotarIA provides healthcare professionals with intelligent clinical assistance while 
            maintaining complete audit integrity through cryptographic hash chains. Every interaction 
            is recorded, verified, and tamper-proof.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/auth/sign-up">
                Start Clinical Session
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/auth/login">View Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-center mb-12">
            Built for Healthcare Compliance
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={MessageSquare}
              title="Clinical AI Assistant"
              description="Get evidence-based clinical decision support powered by advanced AI, with real-time risk assessment and confidence scoring."
            />
            <FeatureCard
              icon={Fingerprint}
              title="Cryptographic Integrity"
              description="Every message is cryptographically hashed and chained, creating an immutable audit trail that proves data integrity."
            />
            <FeatureCard
              icon={FileCheck}
              title="Compliance Ready"
              description="Purpose-built for healthcare regulations. Complete audit trails, role-based access, and verified session histories."
            />
            <FeatureCard
              icon={Lock}
              title="Patient Privacy"
              description="Patient identifiers are automatically anonymized using cryptographic hashing. No PHI is ever stored in plain text."
            />
            <FeatureCard
              icon={Users}
              title="Role-Based Access"
              description="Doctors, auditors, and compliance officers each have tailored interfaces designed for their specific workflows."
            />
            <FeatureCard
              icon={Clock}
              title="Real-Time Verification"
              description="Auditors can verify any session in real-time, confirming the complete hash chain from first message to last."
            />
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-center mb-12">How It Works</h2>
          <div className="space-y-8">
            <StepCard
              number={1}
              title="Start a Clinical Session"
              description="Enter an anonymized patient identifier to begin. The system creates a new auditable session with a unique cryptographic chain."
            />
            <StepCard
              number={2}
              title="Consult with AI"
              description="Describe the clinical situation and receive AI-powered recommendations with risk assessments and confidence scores."
            />
            <StepCard
              number={3}
              title="Every Message is Sealed"
              description="Each message is hashed with SHA-256 and linked to the previous hash, creating an unbreakable chain of custody."
            />
            <StepCard
              number={4}
              title="Verify Anytime"
              description="Auditors can cryptographically verify any session, proving that no data has been modified since creation."
            />
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold mb-4">
            Ready to Enhance Your Clinical Workflow?
          </h2>
          <p className="mb-8 opacity-90">
            Join healthcare professionals who trust NotarIA for compliant AI-assisted clinical decision support.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/auth/sign-up">
              Create Your Account
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
            Clinical AI with immutable audit trails. Built for healthcare compliance.
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
