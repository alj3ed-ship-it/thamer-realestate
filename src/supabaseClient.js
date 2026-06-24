import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rmdwemrmtfcwvuxwskid.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtZHdlbXJtdGZjd3Z1eHdza2lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MzA1MjksImV4cCI6MjA5NzUwNjUyOX0.DwpYouNXauUvafc6hNFAc6P6UCk9zBZdXJ7GgZki6CI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)