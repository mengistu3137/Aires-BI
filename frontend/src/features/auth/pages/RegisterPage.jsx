import React, { useEffect } from 'react'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import { useRegister } from '../hooks/useRegister.js'
import { useAuth } from '@/hooks/useAuth.js'
import { RegisterForm } from '../components/RegisterForm.jsx'
import { AuthErrorMessage } from '../components/AuthErrorMessage.jsx'
import { extractErrorMessage } from '@/utils/errors.js'
import Logo from '@/components/Logo.jsx'
import toast from 'react-hot-toast'

export const RegisterPage = () => {
  const navigate = useNavigate()
  const { isAuthenticated, isInitialized } = useAuth()
  const { mutate, isPending, error, isSuccess } = useRegister()

  const handleRegisterSubmit = (values) => {
    mutate(values)
  }

  // Show success message and redirect to login
  useEffect(() => {
    if (isSuccess) {
      toast.success('Organization created successfully! Please sign in to continue.')

      // Redirect to login after success
      const timer = setTimeout(() => {
        navigate('/login')
      }, 1500) // 1.5 second delay to show success message

      return () => clearTimeout(timer)
    }
  }, [isSuccess, navigate])

  // Prevent flicker during startup [11]
  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  // Redirect to dashboard if session exists [11]
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="relative min-h-screen bg-background px-4 sm:px-6 py-6 sm:py-10">
      {/* Decorative backdrop glow circles [1] — isolated into their own clipped
          layer so `overflow-hidden` here doesn't break `position: sticky`
          on descendants (sticky is disabled by any ancestor that clips overflow). */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary-200/60 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-secondary-200/50 blur-3xl" />
      </div>

      {/* Split-screen layout grid */}
      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-start gap-6 lg:grid-cols-2 lg:gap-10">
        {/* Left Side: Brand Informational Panel [1] */}
        <section className="glass-panel p-6 sm:p-8 lg:sticky lg:top-10 lg:self-start">
          <Logo />
          <p className="mt-4 sm:mt-6 text-[10px] sm:text-xs uppercase tracking-[0.25em] text-text-secondary font-bold">
            Milki Business Management Suite
          </p>
          <h1 className="mt-2 sm:mt-4 text-3xl font-extrabold leading-tight text-text-primary sm:text-4xl lg:text-5xl tracking-tight">
            Bootstrap Your Business Workspace in Minutes.
          </h1>
          {/* Paragraph is hidden on narrow mobile screens to bring the form up immediately */}
          <p className="mt-4 max-w-lg text-sm font-semibold leading-relaxed text-text-secondary sm:text-base hidden md:block">
            Join other organizations leveraging Milki POS. Gain instant access to our active 14-day
            free trial featuring point of sale checkouts, robust stock controls, and comprehensive
            business summaries tailored to your exact industry [1].
          </p>
        </section>

        {/* Right Side: Interactive Registration Form Panel [1] */}
        <section className="glass-panel p-6 shadow-soft-xl sm:p-8">
          <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
            Create Workspace
          </h2>
          <p className="mt-1 text-sm font-semibold text-text-secondary">
            Set up your organization parameters to get started.
          </p>
          <div className="mt-6">
            <AuthErrorMessage message={error ? extractErrorMessage(error) : null} />
            <RegisterForm onSubmit={handleRegisterSubmit} isLoading={isPending} />
          </div>
          <div className="mt-5 text-center">
            <p className="text-xs font-semibold text-text-secondary">
              Already have a workspace?{' '}
              <Link
                to="/login"
                className="text-primary-600 hover:text-primary-700 font-bold transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
