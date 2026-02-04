import { createClient } from '@supabase/supabase-js'

// Supabase bağlantı bilgileri
const supabaseUrl = 'https://gsgdljcmegiaykeiuikh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZ2RsamNtZWdpYXlrZWl1aWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODQzNjIsImV4cCI6MjA4NTc2MDM2Mn0.FFIgclGA6Pty4bAt_eEnPpbcnDg5tLQLG0oIg5OIVfA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Veritabanı bağlantısını test et
export const testConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('projects').select('count').limit(1)
    return !error
  } catch {
    return false
  }
}
