import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const url = process.env.VITE_SUPABASE_URL;
// Use anon key, since service key seems mismatched in .env
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function run() {
  console.log("Connecting to Supabase...");
  console.log("URL:", url);
  
  const { data, error } = await supabase
    .from('student_marks')
    .delete()
    .not('id', 'is', null);
    
  if (error) {
    console.error("Failed to delete records:", error);
  } else {
    console.log("Successfully deleted all student_marks records.");
  }
}

run();
