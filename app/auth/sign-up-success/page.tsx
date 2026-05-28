import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, Mail } from 'lucide-react'

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">NotarIA</h1>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              {"We've sent you a confirmation link to verify your email address."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>
              Click the link in the email to complete your registration and access the clinical AI assistant.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button asChild variant="outline" className="w-full">
              <Link href="/auth/login">Return to sign in</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
