import { createClient } from '@supabase/supabase-js'

// These will be set when we create the Supabase project
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Generate or retrieve device ID
export const getDeviceId = () => {
  let deviceId = localStorage.getItem('cpmai_device_id')
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem('cpmai_device_id', deviceId)
  }
  return deviceId
}
