import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Rocket,
  Lock,
  Mail,
  User,
  Calendar,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuthStore } from '@/stores/authStore'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, isLoading, authError, clearError } = useAuthStore()

  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState<string>('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!fullName.trim()) {
      errors.fullName = 'Enter your full name.'
    } else if (fullName.trim().length < 2) {
      errors.fullName = 'Name must be at least 2 characters.'
    }

    const parsedAge = parseInt(age, 10)
    if (!age || isNaN(parsedAge)) {
      errors.age = 'Age is required.'
    } else if (parsedAge < 10) {
      errors.age = 'Minimum cadet flight eligibility age is 10.'
    } else if (parsedAge > 120) {
      errors.age = 'Please enter a valid age.'
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim()) {
      errors.email = 'Enter your email address.'
    } else if (!emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address.'
    }

    if (!password) {
      errors.password = 'Password is required.'
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.'
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm Password is required.'
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!validateForm()) {
      return
    }

    const res = await register({
      fullName: fullName.trim(),
      age: parseInt(age, 10),
      email: email.trim(),
      password,
    })

    if (res.success) {
      // Redirect to Mission Control Dashboard
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center p-4 relative overflow-hidden py-10">
      {/* Background celestial glow effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-accent-blue/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-10 left-10 w-[300px] h-[300px] bg-accent-cyan/10 rounded-full blur-[100px] pointer-events-none" />

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
        className="w-full max-w-lg z-10"
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
            <ShieldCheck className="h-3.5 w-3.5" /> New commander
          </div>
        </div>

        <Card className="bg-bg-secondary/85 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/80">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold tracking-tight text-white flex items-center justify-between">
              <span>Create your account</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30 uppercase">
                New Profile
              </span>
            </CardTitle>
            <CardDescription className="text-text-muted text-xs">
              You start with 500,000 credits and the Lunar Explorer mission.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {authError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4 p-3 rounded-lg bg-status-danger/10 border border-status-danger/30 text-status-danger text-xs flex items-center gap-2.5 font-medium"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{authError}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name & Age Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-mono font-medium text-text-secondary flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-accent-cyan" />
                    Full name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value)
                      if (validationErrors.fullName) {
                        setValidationErrors((prev) => ({ ...prev, fullName: '' }))
                      }
                    }}
                    placeholder="Priya Raman"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-bg-tertiary/70 border border-white/10 text-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan transition-all"
                  />
                  {validationErrors.fullName && (
                    <p className="text-[11px] text-status-danger">{validationErrors.fullName}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-medium text-text-secondary flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-accent-cyan" />
                    Age
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="120"
                    required
                    value={age}
                    onChange={(e) => {
                      setAge(e.target.value)
                      if (validationErrors.age) {
                        setValidationErrors((prev) => ({ ...prev, age: '' }))
                      }
                    }}
                    placeholder="25"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-bg-tertiary/70 border border-white/10 text-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan transition-all"
                  />
                  {validationErrors.age && (
                    <p className="text-[11px] text-status-danger">{validationErrors.age}</p>
                  )}
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-text-secondary flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-accent-cyan" />
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (validationErrors.email) {
                      setValidationErrors((prev) => ({ ...prev, email: '' }))
                    }
                  }}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-bg-tertiary/70 border border-white/10 text-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan transition-all"
                />
                {validationErrors.email && (
                  <p className="text-[11px] text-status-danger">{validationErrors.email}</p>
                )}
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-medium text-text-secondary flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-accent-cyan" />
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (validationErrors.password) {
                          setValidationErrors((prev) => ({ ...prev, password: '' }))
                        }
                      }}
                      placeholder="Min 6 characters"
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
                  {validationErrors.password && (
                    <p className="text-[11px] text-status-danger">{validationErrors.password}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-medium text-text-secondary flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent-cyan" />
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (validationErrors.confirmPassword) {
                          setValidationErrors((prev) => ({ ...prev, confirmPassword: '' }))
                        }
                      }}
                      placeholder="Repeat password"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-bg-tertiary/70 border border-white/10 text-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {validationErrors.confirmPassword && (
                    <p className="text-[11px] text-status-danger">{validationErrors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-accent-blue to-accent-cyan hover:opacity-95 text-navy-950 font-mono font-bold tracking-wide shadow-lg shadow-accent-cyan/20 py-5 text-sm mt-2 border-0"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-navy-950 border-t-transparent rounded-full" />
                    Creating account…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Create account <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            {/* Login Navigation Link */}
            <div className="mt-6 pt-5 border-t border-white/10 text-center">
              <p className="text-xs text-text-secondary">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-mono text-accent-cyan hover:underline font-semibold"
                >
                  Sign in
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
          <span>Your data stays in your account</span>
          <span>•</span>
          <span>Free to play</span>
        </div>
      </motion.div>
    </div>
  )
}

