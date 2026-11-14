import { useGameStore } from '@/stores/gameStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { Settings, Volume2, Monitor, BookOpen, RotateCcw, Palette } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function SettingsPage() {
  const { settings, updateSettings, resetProgress } = useGameStore()

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      resetProgress()
      localStorage.removeItem('orbit-x-missions')
      localStorage.removeItem('orbit-x-spacecraft')
      window.location.reload()
    }
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Standardized Header */}
        <PageHeader
          eyebrow="Account"
          title="Settings"
          description="Configure audiovisual output, graphics fidelity, tutorial guidance, and telemetry measurement units."
          icon={Settings}
          iconColor="text-accent-blue"
        />

        {/* Appearance & Color Theme Card */}
        <Card className="border-white/10">
          <CardHeader className="p-4 sm:p-5 pb-2 border-b border-white/5">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4.5 w-4.5 text-accent-cyan" />
              Interface Theme & Visual Appearance
            </CardTitle>
            <CardDescription className="text-xs">
              Toggle between Dark aerospace control center and Light engineering workstation themes
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-text-primary">Application Color Mode</p>
              <p className="text-xs text-text-muted">
                Applied globally across all operations, navigation, and telemetry consoles
              </p>
            </div>
            <ThemeToggle />
          </CardContent>
        </Card>

        {/* Audio Card */}
        <Card className="border-white/10">
          <CardHeader className="p-4 sm:p-5 pb-2 border-b border-white/5">
            <CardTitle className="text-base flex items-center gap-2">
              <Volume2 className="h-4.5 w-4.5 text-accent-cyan" />
              Audio Output
            </CardTitle>
            <CardDescription className="text-xs">Sound and music preferences</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            <SettingToggle
              label="Telemetry Sound Effects"
              description="Thruster burn cues, radio beeps, and audio alarms"
              enabled={settings.soundEnabled}
              onToggle={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
            />
            <SettingToggle
              label="Atmospheric Ambient Music"
              description="Low-frequency deep space acoustic backdrop"
              enabled={settings.musicEnabled}
              onToggle={() => updateSettings({ musicEnabled: !settings.musicEnabled })}
            />
          </CardContent>
        </Card>

        {/* Graphics Card */}
        <Card className="border-white/10">
          <CardHeader className="p-4 sm:p-5 pb-2 border-b border-white/5">
            <CardTitle className="text-base flex items-center gap-2">
              <Monitor className="h-4.5 w-4.5 text-accent-cyan" />
              Visual Engine & Rendering
            </CardTitle>
            <CardDescription className="text-xs">Three.js shader fidelity and texture filtering</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">Graphics Quality Preset</p>
                <p className="text-xs text-text-muted">Low is a low-power mode for laptops and projectors (also via ?lite in any URL). Detected automatically on first run.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {(['low', 'medium', 'high'] as const).map((q) => (
                  <Button
                    key={q}
                    variant={settings.graphicsQuality === q ? 'default' : 'secondary'}
                    size="sm"
                    className="text-xs capitalize font-mono"
                    onClick={() => updateSettings({ graphicsQuality: q })}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gameplay Card */}
        <Card className="border-white/10">
          <CardHeader className="p-4 sm:p-5 pb-2 border-b border-white/5">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4.5 w-4.5 text-accent-cyan" />
              Gameplay & Flight Units
            </CardTitle>
            <CardDescription className="text-xs">Engineering notations and telemetry conventions</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            <SettingToggle
              label="Interactive Engineering Tutorials"
              description="Display aerodynamic guidance hints during spacecraft assembly"
              enabled={settings.showTutorials}
              onToggle={() => updateSettings({ showTutorials: !settings.showTutorials })}
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/5">
              <div>
                <p className="text-sm font-semibold text-text-primary">Measurement Notation</p>
                <p className="text-xs text-text-muted">Standard metric aerospace (kg, m/s, W) or imperial</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {(['metric', 'imperial'] as const).map((u) => (
                  <Button
                    key={u}
                    variant={settings.units === u ? 'default' : 'secondary'}
                    size="sm"
                    className="text-xs capitalize font-mono"
                    onClick={() => updateSettings({ units: u })}
                  >
                    {u}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone Reset */}
        <Card className="border-status-danger/30 bg-status-danger/5">
          <CardHeader className="p-4 sm:p-5 pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-status-danger">
              <RotateCcw className="h-4.5 w-4.5" />
              Reset Campaign Progress
            </CardTitle>
            <CardDescription className="text-xs">Erase all spacecraft designs, unlocked achievements, and mission scores</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <Button variant="danger" size="sm" onClick={handleReset} className="text-xs font-semibold">
              Purge Flight Cache & Reset
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}

function SettingToggle({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string
  description: string
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer shrink-0 ${
          enabled ? 'bg-accent-blue' : 'bg-white/10'
        }`}
        aria-label={label}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
