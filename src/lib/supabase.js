import { createClient } from '@supabase/supabase-js'

// Supabase configuration - set these in your environment or replace with your values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Only create client if credentials are configured
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

export const isSupabaseConfigured = () => !!supabase

// Generate or retrieve device ID
export const getDeviceId = () => {
  let deviceId = localStorage.getItem('cpmai_device_id')
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem('cpmai_device_id', deviceId)
  }
  return deviceId
}

// ========== AUTH HELPERS ==========

// Sign up with email and password
export const signUp = async (email, password) => {
  if (!supabase) return { success: false, error: 'Supabase not configured', user: null }
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    
    if (error) throw error
    return { success: true, user: data.user, error: null }
  } catch (error) {
    console.error('Sign up failed:', error)
    return { success: false, error: error.message, user: null }
  }
}

// Sign in with email and password
export const signIn = async (email, password) => {
  if (!supabase) return { success: false, error: 'Supabase not configured', user: null }
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    return { success: true, user: data.user, error: null }
  } catch (error) {
    console.error('Sign in failed:', error)
    return { success: false, error: error.message, user: null }
  }
}

// Sign out
export const signOut = async () => {
  if (!supabase) return { success: false, error: 'Supabase not configured' }
  
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('Sign out failed:', error)
    return { success: false, error: error.message }
  }
}

// Get current session user
export const getUser = async () => {
  if (!supabase) return { success: false, error: 'Supabase not configured', user: null }
  
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error && error.status !== 400) throw error // 400 = no session
    return { success: true, user: data.user || null, error: null }
  } catch (error) {
    console.error('Get user failed:', error)
    return { success: false, error: error.message, user: null }
  }
}

// Subscribe to auth state changes
export const onAuthChange = (callback) => {
  if (!supabase) return () => {}
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null, event)
  })
  
  return () => subscription?.unsubscribe?.()
}

// Sync progress to Supabase
// If userId is provided, use user_id; otherwise use device_id
export const syncProgressToCloud = async (deviceId, progress, userId = null) => {
  if (!supabase) return { success: false, error: 'Supabase not configured' }
  
  try {
    const entries = Object.entries(progress).map(([cardId, data]) => ({
      device_id: userId ? null : deviceId,
      user_id: userId || null,
      card_id: cardId,
      correct_streak: data.correct_streak || 0,
      times_shown: data.times_shown || 0,
      times_correct: data.times_correct || 0,
      ease_factor: data.ease_factor || 2.5,
      interval_days: data.interval_days || 0,
      next_due: data.next_due || null,
      last_shown: data.last_shown || null,
    }))

    // Upsert all progress entries
    const conflictKey = userId ? 'user_id,card_id' : 'device_id,card_id'
    const { error } = await supabase
      .from('device_progress')
      .upsert(entries, { onConflict: conflictKey })

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Sync to cloud failed:', error)
    return { success: false, error: error.message }
  }
}

// Fetch progress from Supabase
// If userId is provided, fetch user_id data; otherwise fetch device_id data
export const fetchProgressFromCloud = async (deviceId, userId = null) => {
  if (!supabase) return { success: false, error: 'Supabase not configured', data: null }
  
  try {
    let query = supabase.from('device_progress').select('*')
    
    if (userId) {
      query = query.eq('user_id', userId)
    } else {
      query = query.eq('device_id', deviceId)
    }

    const { data, error } = await query

    if (error) throw error

    // Convert to the format our app expects
    const progress = {}
    data?.forEach(row => {
      progress[row.card_id] = {
        correct_streak: row.correct_streak,
        times_shown: row.times_shown,
        times_correct: row.times_correct,
        ease_factor: row.ease_factor,
        interval_days: row.interval_days,
        next_due: row.next_due,
        last_shown: row.last_shown,
      }
    })

    return { success: true, data: progress }
  } catch (error) {
    console.error('Fetch from cloud failed:', error)
    return { success: false, error: error.message, data: null }
  }
}

// Migrate device progress to user account on first login
export const migrateDeviceProgressToUser = async (deviceId, userId) => {
  if (!supabase) return { success: false, error: 'Supabase not configured' }
  
  try {
    // Fetch device data
    const { data: deviceData, error: fetchError } = await supabase
      .from('device_progress')
      .select('*')
      .eq('device_id', deviceId)

    if (fetchError) throw fetchError

    if (!deviceData || deviceData.length === 0) {
      // No device data to migrate
      return { success: true, migrated: 0 }
    }

    // Prepare migration data
    const migratedEntries = deviceData.map(row => ({
      device_id: null,
      user_id: userId,
      card_id: row.card_id,
      correct_streak: row.correct_streak,
      times_shown: row.times_shown,
      times_correct: row.times_correct,
      ease_factor: row.ease_factor,
      interval_days: row.interval_days,
      next_due: row.next_due,
      last_shown: row.last_shown,
    }))

    // Upsert to user data (overwrites if card exists)
    const { error: upsertError } = await supabase
      .from('device_progress')
      .upsert(migratedEntries, { onConflict: 'user_id,card_id' })

    if (upsertError) throw upsertError

    return { success: true, migrated: deviceData.length }
  } catch (error) {
    console.error('Migration failed:', error)
    return { success: false, error: error.message, migrated: 0 }
  }
}

// Save session to Supabase
// If userId is provided, use user_id; otherwise use device_id
export const saveSessionToCloud = async (deviceId, session, userId = null) => {
  if (!supabase) return { success: false, error: 'Supabase not configured' }
  
  try {
    const { error } = await supabase
      .from('session_history')
      .insert({
        device_id: userId ? null : deviceId,
        user_id: userId || null,
        started_at: session.started_at || new Date().toISOString(),
        completed_at: new Date().toISOString(),
        cards_shown: session.cards_shown,
        cards_correct: session.cards_correct,
        cards_incorrect: session.cards_incorrect,
        cards_skipped: session.cards_skipped,
      })

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Save session failed:', error)
    return { success: false, error: error.message }
  }
}

// Fetch sessions from Supabase
// If userId is provided, fetch user_id data; otherwise fetch device_id data
export const fetchSessionsFromCloud = async (deviceId, limit = 100, userId = null) => {
  if (!supabase) return { success: false, error: 'Supabase not configured', data: [] }
  
  try {
    let query = supabase
      .from('session_history')
      .select('*')

    if (userId) {
      query = query.eq('user_id', userId)
    } else {
      query = query.eq('device_id', deviceId)
    }

    const { data, error } = await query
      .order('completed_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    // Convert to app format
    const sessions = data?.map(row => ({
      id: row.id,
      date: row.completed_at,
      cards_shown: row.cards_shown,
      cards_correct: row.cards_correct,
      cards_incorrect: row.cards_incorrect,
      cards_skipped: row.cards_skipped,
    })) || []

    return { success: true, data: sessions }
  } catch (error) {
    console.error('Fetch sessions failed:', error)
    return { success: false, error: error.message, data: [] }
  }
}
