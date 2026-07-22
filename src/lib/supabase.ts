import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Clients typés par le schéma généré (src/types/database.ts) — les requêtes
// connaissent les colonnes et la RPC à la compilation.
// Régénérer après une migration : voir l'en-tête de src/types/database.ts.

// Client public (lecture côté client)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Client admin (lecture/écriture côté serveur uniquement)
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey)
