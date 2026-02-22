/* ============================================
   StockTracker — Supabase Client Configuration
   ============================================ */

const SUPABASE_URL = 'https://gsmyxrruxbcmrcntmwrn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzbXl4cnJ1eGJjbXJjbnRtd3JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NzMwMTgsImV4cCI6MjA4NzE0OTAxOH0.-de4ZYD_CFF2bh82P0Vh0-6YRmCJL2mVnYoQQWXF8pY';

let supabaseClient;
if (window.supabase && window.supabase.createClient) {
   supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
   console.error('Supabase library not loaded! Check your internet connection.');
   alert('Failed to load Supabase. Please check your internet connection and refresh the page.');
}
