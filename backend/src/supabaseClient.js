import dotenv from "dotenv";

import { createClient } from "@supabase/supabase-js/dist/index.cjs";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
// const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey );