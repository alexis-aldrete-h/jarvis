import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Get environment variables - NEXT_PUBLIC_ variables are available in browser
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Only create Supabase client if both URL and key are provided
let supabase: SupabaseClient | null = null

// Log environment variable status (only in browser)
if (typeof window !== 'undefined') {
  console.log('🔍 Supabase Environment Check:', {
    url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING',
    key: supabaseAnonKey ? 'Set (' + supabaseAnonKey.substring(0, 10) + '...)' : 'MISSING',
    urlLength: supabaseUrl.length,
    keyLength: supabaseAnonKey.length,
  })
}

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
    if (typeof window !== 'undefined') {
      console.log('✅ Supabase client initialized successfully')
    }
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error)
    supabase = null
  }
} else {
  if (typeof window !== 'undefined') {
    console.warn('⚠️ Supabase environment variables are not set. Gantt data will fall back to localStorage.')
    console.warn('URL:', supabaseUrl ? 'Set' : 'Missing')
    console.warn('Key:', supabaseAnonKey ? 'Set' : 'Missing')
  }
}

export { supabase }

