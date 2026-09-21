import { createClient } from "@supabase/supabase-js";

// Cliente "público" — se usa en el navegador, solo para lecturas permitidas
// (por ejemplo, mostrar los nombres del Personal en la pantalla de marcación).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
