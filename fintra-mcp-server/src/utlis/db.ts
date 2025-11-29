import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";
import postgres from 'postgres'


dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';




if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set in .env file");
}

if (!SUPABASE_URL || !supabaseServiceKey) {
  console.error("ERROR: SUPABASE_URL or SUPABASE_ANON_KEY is not set in .env file");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

await pool.connect().then(client => {
    console.log("Connected to Supabase Postgres");
    client.release();
  })
  .catch(err => console.error("DB connection error:", err));

export default pool;
