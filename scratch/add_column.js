const { Client } = require('pg');

async function addColumn() {
  const connectionString = 'postgresql://postgres:ExamTrack%402026@db.woqhizacenduogpxglen.supabase.co:5432/postgres';
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase database!');
    
    const query = `ALTER TABLE public.exam_schedules ADD COLUMN IF NOT EXISTS exam_year TEXT;`;
    await client.query(query);
    console.log('Successfully added "exam_year" column!');
    
  } catch (err) {
    console.error('Error executing query:', err);
  } finally {
    await client.end();
  }
}

addColumn();
