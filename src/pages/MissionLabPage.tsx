import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Compass,
  Scale,
  Zap,
  Target,
  ArrowRight,
  BookOpen,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'

export default function MissionLabPage() {
  const [activeTab, setActiveTab] = useState<'sandbox' | 'challenges' | 'trade-study' | 'glossary'>('challenges')

  const challenges = [
    {
      id: 'ch-1',
      title: 'Ultralight Lunar Impactor',
      difficulty: 'HARD',
      reward: '500 XP • 85k Cr',
      constraint: 'Dry Mass < 250 kg • Must achieve 4,200 m/s Delta-V',
      description: 'Design the minimum mass spacecraft capable of trans-lunar injection without chemical booster assist.',
    },
    {
      id: 'ch-2',
      title: 'Deep Space Power Austerity',
      difficulty: 'MEDIUM',
      reward: '350 XP • 60k Cr',
      constraint: 'Zero Solar Arrays • RTG & Battery power only (P < 120 W)',
      description: 'Design a deep-space probe that operates in permanent outer-solar-system darkness with strict energy limits.',
    },
    {
      id: 'ch-3',
      title: 'Budget Tightrope: Low-Cost Mars Explorer',
      difficulty: 'EXPERT',
      reward: '750 XP • 120k Cr',
      constraint: 'Total Project Cost < 110,000 Cr • High-Res Camera required',
      description: 'Balance interplanetary launch vehicles and high-gain communication arrays while strictly under budget.',
    },
  ]

  const glossaryItems = [
    { term: 'Delta-V (Δv)', def: 'Change in velocity required to perform an orbital maneuver, measured in meters per second (m/s). Governed by the Tsiolkovsky rocket equation.' },
    { term: 'Specific Impulse (Isp)', def: 'Measure of rocket engine efficiency: thrust produced per unit weight of propellant consumed per second. Higher Isp requires less fuel for the same Δv.' },
    { term: 'Hohmann Transfer', def: 'An elliptical orbital transfer between two circular coplanar orbits using two instantaneous impulsive engine burns. It is mathematically the most fuel-efficient transfer.' },
    { term: 'Vis-Viva Equation', def: 'Relates spacecraft velocity, current radial distance from the primary body, and the orbit semi-major axis: v = sqrt(mu * (2/r - 1/a)).' },
    { term: 'Deep Space Network (DSN)', def: 'International network of massive 70-meter parabolic antenna facilities positioned approximately 120 degrees apart on Earth (Goldstone, Madrid, Canberra) for continuous deep-space tracking.' },
    { term: 'Safe Mode (FDIR)', def: 'Automated survival state where non-essential payloads are powered down, the attitude control system locks the solar arrays to the Sun, and low-gain emergency comms open.' },
  ]

  return (
    <PageContainer variant="wide" className="space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="Build"
        title="Mission lab"
        description="Advanced sandbox mission design, engineering constraint challenges, spacecraft trade studies, and orbital mechanics reference."
        icon={Compass}
        iconColor="text-accent-cyan"
        badge={
          <Badge variant="cyan" className="font-mono text-xs">
            AEROSPACE LAB 3.0
          </Badge>
        }
      />

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-3">
        {[
          { id: 'challenges', label: 'Engineering Challenges', icon: Target },
          { id: 'trade-study', label: 'Spacecraft Trade Study', icon: Scale },
          { id: 'sandbox', label: 'Advanced Sandbox Simulator', icon: Zap },
          { id: 'glossary', label: 'Aerospace Engineering Glossary', icon: BookOpen },
        ].map((tab) => {
          const Icon = tab.icon
          const isSelected = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                isSelected
                  ? 'bg-accent-blue text-white font-bold shadow-sm shadow-accent-blue/20'
                  : 'bg-bg-panel text-text-muted hover:text-text-primary hover:bg-bg-elevated'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab: Engineering Challenges */}
      {activeTab === 'challenges' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {challenges.map((ch) => (
            <Card key={ch.id} className="border-white/10 flex flex-col justify-between hover:border-accent-blue/40 transition-all">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant={ch.difficulty === 'EXPERT' ? 'danger' : ch.difficulty === 'HARD' ? 'warning' : 'cyan'}>
                    {ch.difficulty}
                  </Badge>
                  <span className="text-[11px] font-mono text-accent-cyan font-bold">{ch.reward}</span>
                </div>
                <CardTitle className="text-base text-text-primary">{ch.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
                <p className="text-xs text-text-secondary leading-relaxed">{ch.description}</p>
                <div className="p-2.5 rounded bg-bg-elevated border border-white/5 font-mono text-xs text-status-warning">
                  {ch.constraint}
                </div>
                <Button size="sm" asChild className="w-full bg-accent-blue hover:bg-accent-blue/90 text-xs font-mono">
                  <Link to="/designer/lunar-explorer">
                    Accept Challenge <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tab: Trade Study Comparison */}
      {activeTab === 'trade-study' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-white/10">
            <CardHeader className="p-4 sm:p-5 pb-2 border-b border-white/5">
              <CardTitle className="text-sm font-mono text-accent-cyan flex items-center justify-between">
                <span>CONFIGURATION ALPHA: CHEMICAL / HIGH THRUST</span>
                <Badge variant="cyan">RAPID TRANSIT</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3 font-mono text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-text-muted">Propulsion Type:</span>
                <span className="font-bold text-text-primary">Bipropellant Hypergolic (Isp 320s)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-text-muted">Thrust Output:</span>
                <span className="font-bold text-text-primary">450 N (Impulsive Burn)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-text-muted">Propellant Mass Required:</span>
                <span className="font-bold text-status-warning">650 kg</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-text-muted">Power Consumption:</span>
                <span className="font-bold text-status-success">30 W (Low)</span>
              </div>
              <p className="text-[11px] font-sans text-text-secondary pt-1 leading-relaxed">
                <strong>Verdict:</strong> Ideal for rapid planetary capture and tight launch windows where engine burn duration must be concise. Requires heavier propellant tanks.
              </p>
            </CardContent>
          </Card>

          <Card className="border-white/10">
            <CardHeader className="p-4 sm:p-5 pb-2 border-b border-white/5">
              <CardTitle className="text-sm font-mono text-status-success flex items-center justify-between">
                <span>CONFIGURATION BETA: ELECTRIC ION PROPULSION</span>
                <Badge variant="success">HIGH EFFICIENCY</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3 font-mono text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-text-muted">Propulsion Type:</span>
                <span className="font-bold text-text-primary">Gridded Xenon Ion (Isp 4100s)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-text-muted">Thrust Output:</span>
                <span className="font-bold text-text-primary">0.09 N (Continuous Spiral)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-text-muted">Propellant Mass Required:</span>
                <span className="font-bold text-status-success">65 kg (-90% fuel savings)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-text-muted">Power Consumption:</span>
                <span className="font-bold text-status-danger">450 W (Requires UltraFlex Arrays)</span>
              </div>
              <p className="text-[11px] font-sans text-text-secondary pt-1 leading-relaxed">
                <strong>Verdict:</strong> Provides incredible delta-v efficiency for deep-space missions, but demands large photovoltaic solar wings and lengthy spiral-out burns.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Sandbox Mode */}
      {activeTab === 'sandbox' && (
        <Card className="border-white/10 bg-gradient-to-r from-bg-panel via-bg-elevated to-bg-panel">
          <CardContent className="p-6 text-center space-y-4 max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-accent-blue/15 border border-accent-blue/30 flex items-center justify-center text-accent-blue mx-auto">
              <Zap className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-text-primary">Unlimited Experimental Sandbox</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Build and simulate any spacecraft configuration with relaxed budget constraints and unlocked deep space hardware. Test experimental orbital transfer mechanics without campaign penalties.
            </p>
            <Button size="lg" asChild className="bg-accent-blue hover:bg-accent-blue/90 font-mono text-xs">
              <Link to="/designer/mars-pathfinder">
                Launch Experimental Sandbox Session <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tab: Aerospace Glossary */}
      {activeTab === 'glossary' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {glossaryItems.map((item) => (
            <Card key={item.term} className="border-white/10">
              <CardContent className="p-4 space-y-1">
                <h4 className="font-bold font-mono text-sm text-accent-cyan">{item.term}</h4>
                <p className="text-xs text-text-secondary leading-relaxed">{item.def}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  )
}
