import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vemubkmthzjjzpgbseox.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlbXVia210aHpqanpwZ2JzZW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MDY4NjgsImV4cCI6MjA3MDM4Mjg2OH0.-EqAxZq0xbkgsZnUWpvuPjpPdmhj13KTqvAZgMVqEuQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);