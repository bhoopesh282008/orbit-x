import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Rocket,
  Mail,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuthStore } from '@/stores/authStore'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuthStore()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setResultMessage(null)

    if (!email.trim()) {
      setErrorMessage('Please enter your flight email address.')
      return
    }

    setIsSubmitting(true)
    const res = await resetPassword(email.trim())
    setIsSubmitting(false)

    if (res.success) {
      setResultMessage(res.message || 'Password reset instructions have been dispatched.')
    } else {
      setErrorMessage(res.error || 'Failed to dispatch reset instructions.')
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background celestial glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent-blue/10 rounded-full blur-[130px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md z-10"
      >
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
            <KeyRound className="h-3.5 w-3.5" /> Credential Recovery Station
          </div>
        </div>

        <Card className="bg-bg-secondary/85 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/80">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold tracking-tight text-white">
              Recover Passcode
            </CardTitle>
            <CardDescription className="text-text-muted text-xs">
              Enter your registered cadet email address to receive password reset authorization.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4 p-3 rounded-lg bg-status-danger/10 border border-status-danger/30 text-status-danger text-xs flex items-center gap-2.5 font-medium"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {resultMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4 p-3 rounded-lg bg-status-success/10 border border-status-success/30 text-status-success text-xs flex items-center gap-2.5 font-medium"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{resultMessage}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-text-secondary flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-accent-cyan" />
                  Registered Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="commander@space-agency.gov"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-bg-tertiary/70 border border-white/10 text-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan transition-all"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-accent-blue hover:bg-accent-blue/90 text-white font-mono font-bold tracking-wide shadow-lg shadow-accent-blue/30 py-5 text-sm"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                    Dispatching Authorization...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Dispatch Recovery Code <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-white/10 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-mono text-accent-cyan hover:underline font-semibold"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Return to Commander Sign-In
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

