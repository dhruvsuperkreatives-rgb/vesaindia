import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://eovocptmziyyjzzmczmh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvdm9jcHRteml5eWp6em1jem1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTcxNDcsImV4cCI6MjA5NTc5MzE0N30.Nej0601kS_C6mE2xPpf9YmVJ-tgCfODqBFBVYBla-xY';

export const supabase = createClient(supabaseUrl, supabaseKey);