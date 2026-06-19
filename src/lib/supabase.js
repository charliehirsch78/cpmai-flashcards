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

// Sync progress to Supabase
export const syncProgressToCloud = async (deviceId, progress) => {
  if (!supabase) return { success: false, error: 'Supabase not configured' }
  
  try {
    const entries = Object.entries(progress).map(([cardId, data]) => ({
      device_id: deviceId,
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
    const { error } = await supabase
      .from('device_progress')
      .upsert(entries, { onConflict: 'device_id,card_id' })

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Sync to cloud failed:', error)
    return { success: false, error: error.message }
  }
}

// Fetch progress from Supabase
export const fetchProgressFromCloud = async (deviceId) => {
  if (!supabase) return { success: false, error: 'Supabase not configured', data: null }
  
  try {
    const { data, error } = await supabase
      .from('device_progress')
      .select('*')
      .eq('device_id', deviceId)

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

// Save session to Supabase
export const saveSessionToCloud = async (deviceId, session) => {
  if (!supabase) return { success: false, error: 'Supabase not configured' }
  
  try {
    const { error } = await supabase
      .from('session_history')
      .insert({
        device_id: deviceId,
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
export const fetchSessionsFromCloud = async (deviceId, limit = 100) => {
  if (!supabase) return { success: false, error: 'Supabase not configured', data: [] }
  
  try {
    const { data, error } = await supabase
      .from('session_history')
      .select('*')
      .eq('device_id', deviceId)
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
