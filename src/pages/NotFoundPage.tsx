import { Link } from 'react-router-dom'
import { Rocket, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/layout/PageContainer'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 text-text-primary">
      <PageContainer className="text-center space-y-6 max-w-md py-12">
        <div className="relative">
          <div className="text-8xl font-semibold text-accent-blue/15 select-none font-mono">404</div>
          <Rocket className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 text-accent-blue animate-bounce" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Telemetry Coordinates Lost</h1>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            The flight path you requested does not correspond to any known orbital vector in the ORBIT-X database.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center pt-2">
          <Button asChild size="sm" className="bg-accent-blue hover:bg-accent-blue/90 font-medium">
            <Link to="/dashboard">
              <Home className="h-4 w-4 mr-1.5" />
              Mission Control
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/">Launchpad Home</Link>
          </Button>
        </div>
      </PageContainer>
    </div>
  )
}
