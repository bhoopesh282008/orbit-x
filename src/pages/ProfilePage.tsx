import { useGameStore } from '@/stores/gameStore'
import { useMissionStore } from '@/stores/missionStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'
import { User, Trophy, Rocket, Star, Target, Zap } from 'lucide-react'

const achievementDefs = [
  { id: 'first-launch', name: 'First Launch', description: 'Complete your first spaceflight mission', icon: Rocket },
  { id: 'lunar-explorer', name: 'Lunar Explorer', description: 'Successfully reach and insert into lunar orbit', icon: Star },
  { id: 'zero-overrun', name: 'Zero Budget Overrun', description: 'Complete a mission within approved allocation', icon: Target },
  { id: 'perfect-mission', name: 'Perfect Mission', description: 'Achieve 100% mission acceptance score', icon: Trophy },
  { id: 'mars-pathfinder', name: 'Mars Pathfinder', description: 'Complete heliocentric cruise and reach Mars', icon: Zap },
]

export default function ProfilePage() {
  const player = useGameStore((s) => s.player)
  const missions = useMissionStore((s) => s.missions)
  const completedCount = missions.filter((m) => m.status === 'completed').length

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Standardized Header */}
        <PageHeader
          eyebrow="Account"
          title="Commander profile"
          description="Aerospace engineer flight credentials, rank progression, and mission achievements record."
          icon={User}
          iconColor="text-accent-blue"
        />

        {/* Profile Header Card */}
        <Card className="border-white/10">
          <CardContent className="p-5 sm:p-7">
            <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 text-center sm:text-left">
              <div className="w-20 h-20 rounded-full bg-accent-blue/20 flex items-center justify-center border-2 border-accent-blue/30 shrink-0">
                <User className="h-10 w-10 text-accent-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-text-primary truncate">{player.name}</h2>
                <p className="text-xs sm:text-sm text-text-secondary">{player.title}</p>
                <div className="mt-2.5 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <Badge className="font-mono text-xs">Level {player.level}</Badge>
                  <Badge variant="cyan" className="font-mono text-xs">{player.credits.toLocaleString()} Credits</Badge>
                  <Badge variant="outline" className="font-mono text-xs">ID: {player.id}</Badge>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-2 pt-4 border-t border-white/5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-text-secondary">Rank Advancement Progress</span>
                <span className="text-text-primary font-bold">{player.xp} / {player.xpToNextLevel} XP</span>
              </div>
              <Progress value={(player.xp / player.xpToNextLevel) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {[
            { label: 'Total Missions', value: missions.length },
            { label: 'Completed', value: completedCount },
            { label: 'Success Rate', value: completedCount > 0 ? `${Math.round((completedCount / missions.length) * 100)}%` : '0%' },
            { label: 'Discoveries', value: player.totalDiscoveries },
          ].map((stat) => (
            <Card key={stat.label} className="border-white/10">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold font-mono text-accent-blue">{stat.value}</p>
                <p className="text-[11px] text-text-muted mt-1 uppercase font-mono tracking-wider">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Achievements Card */}
        <Card className="border-white/10">
          <CardHeader className="p-4 sm:p-5 pb-2 border-b border-white/5">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4.5 w-4.5 text-status-warning" />
              Aerospace Medals & Commendations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-2.5">
            <div className="grid gap-2.5">
              {achievementDefs.map((achievement) => {
                const unlocked = player.achievements.includes(achievement.id)
                return (
                  <div
                    key={achievement.id}
                    className={cn(
                      'flex items-center gap-4 p-3 rounded-lg border transition-colors',
                      unlocked
                        ? 'border-status-warning/20 bg-status-warning/5'
                        : 'border-white/5 bg-white/[0.02] opacity-50'
                    )}
                  >
                    <div className={cn(
                      'p-2 rounded-lg shrink-0',
                      unlocked ? 'bg-status-warning/20 text-status-warning' : 'bg-white/5 text-text-muted'
                    )}>
                      <achievement.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{achievement.name}</p>
                      <p className="text-xs text-text-muted truncate">{achievement.description}</p>
                    </div>
                    <Badge variant={unlocked ? 'success' : 'outline'} className="text-[10px] shrink-0 font-mono">
                      {unlocked ? 'UNLOCKED' : 'LOCKED'}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
