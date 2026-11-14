import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export async function ensureAuthenticatedSession() {
  if (!isSupabaseConfigured || !supabase) {
    return null
  }

  try {
    // 1. Check existing session
    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData.session?.user) {
      return sessionData.session.user
    }

    // 2. Automatically sign in anonymously without disrupting UI
    const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously()
    if (anonError) {
      console.warn('[ORBIT-X Backend] Anonymous auth not enabled or failed, falling back to local mode:', anonError.message)
      return null
    }

    return anonData.user
  } catch (err) {
    console.warn('[ORBIT-X Backend] Auth session init error:', err)
    return null
  }
}

