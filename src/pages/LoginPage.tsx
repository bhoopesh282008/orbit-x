import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Rocket,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  CheckSquare,
  Square,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuthStore } from '@/stores/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isLoading, authError, clearError } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [localError, setLocalError] = useState<string | null>(null)

  const from = (location.state as any)?.from?.pathname || '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    clearError()

    if (!email.trim() || !password) {
      setLocalError('Invalid username or password')
      return
    }

    const res = await login({
      email: email.trim(),
      password,
      rememberMe,
    })

    if (res.success) {
      navigate(from, { replace: true })
    }
  }

  const displayedError = localError || authError

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background celestial glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-blue/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-accent-cyan/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Subtle coordinate grid lines overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-blue to-accent-cyan flex items-center justify-center shadow-lg shadow-accent-cyan/20 group-hover:scale-105 transition-transform">
              <Rocket className="h-5 w-5 text-navy-950" />
            </div>
            <span className="font-mono text-xl font-semibold tracking-widest text-text-primary">
              ORBIT<span className="text-accent-blue">-X</span>
            </span>
          </Link>
          <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-accent-cyan uppercase tracking-widest">
            <ShieldCheck className="h-3.5 w-3.5" /> Mission console
          </div>
        </div>

        <Card className="bg-bg-secondary/85 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/80">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold tracking-tight text-white flex items-center justify-between">
              <span>Sign in</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-blue/20 text-accent-cyan border border-accent-blue/30 uppercase">
                Secured
              </span>
            </CardTitle>
            <CardDescription className="text-text-muted text-xs">
              Welcome back. Pick up your campaign where you left it.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {displayedError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4 p-3 rounded-lg bg-status-danger/10 border border-status-danger/30 text-status-danger text-xs flex items-center gap-2.5 font-medium"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{displayedError}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Address Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-text-secondary flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-accent-cyan" />
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-bg-tertiary/70 border border-white/10 text-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-medium text-text-secondary flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-accent-cyan" />
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-[11px] font-mono text-accent-blue hover:text-accent-cyan transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-bg-tertiary/70 border border-white/10 text-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Option */}
              <div className="flex items-center justify-between pt-1 pb-2">
                <label
                  onClick={() => setRememberMe(!rememberMe)}
                  className="flex items-center gap-2 cursor-pointer text-xs text-text-secondary select-none"
                >
                  {rememberMe ? (
                    <CheckSquare className="h-4 w-4 text-accent-cyan" />
                  ) : (
                    <Square className="h-4 w-4 text-text-muted" />
                  )}
                  <span>Keep me signed in</span>
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-accent-blue hover:bg-accent-blue/90 text-white font-mono font-bold tracking-wide shadow-lg shadow-accent-blue/30 py-5 text-sm"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                    Verifying Credentials...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign in <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            {/* Registration Navigation Link */}
            <div className="mt-6 pt-5 border-t border-white/10 text-center">
              <p className="text-xs text-text-secondary">
                New to ORBIT-X?{' '}
                <Link
                  to="/register"
                  className="font-mono text-accent-cyan hover:underline font-semibold"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Try the game without an account */}
        <Link
          to="/demo/moon/briefing"
          className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-text-secondary transition hover:border-accent-blue/50 hover:text-text-primary"
        >
          Explore a mission without an account <span aria-hidden>→</span>
        </Link>

        {/* Technical Footer Accent */}
        <div className="mt-6 text-center text-[10px] font-mono text-text-muted flex items-center justify-center gap-4">
          <span>Encrypted connection</span>
          <span>•</span>
          <span>All systems nominal</span>
        </div>
      </motion.div>
    </div>
  )
}

