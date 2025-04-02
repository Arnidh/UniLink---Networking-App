
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://rnmidonrlotdhlimfgmo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJubWlkb25ybG90ZGhsaW1mZ21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MjY3NzIsImV4cCI6MjA1OTEwMjc3Mn0.sLzaWFnnVCp8iV24_aTH_kY81iJ3tHCEjcsLX6pCCGk";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: localStorage
    }
  }
);
