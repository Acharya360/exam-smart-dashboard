import fs from 'fs';

let url = 'https://noqsfzdotsgjkjcwpkpu.supabase.co';
let key = 'placeholder-key';

if (fs.existsSync('.env')) {
  const content = fs.readFileSync('.env', 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
      url = trimmed.split('=')[1]?.trim() || url;
    }
    if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      key = trimmed.split('=')[1]?.trim() || key;
    }
  }
}

console.log('Testing Supabase Cloud Connection:');
console.log('  Target URL :', url);
console.log('  Anon Key   :', key ? `${key.slice(0, 15)}... (Length: ${key.length})` : '(none)');
console.log('');

try {
  const res = await fetch(`${url}/rest/v1/`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });

  console.log('  HTTP Status:', res.status, res.statusText);
  const text = await res.text();

  if (res.ok) {
    console.log('[SUCCESS] Supabase Cloud REST API is alive and operational!');
    if (text.includes('definitions') || text.includes('paths')) {
      console.log('[INFO] OpenAPI schema detected. Cloud tables are accessible.');
    }
  } else if (res.status === 401) {
    console.log('[NOTICE] Gateway reachable, but Anon Key was rejected.');
    console.log('         Please check your Project Anon Key in Supabase Dashboard -> Settings -> API.');
  } else {
    console.log('[INFO] Gateway response:', text.slice(0, 120));
  }
} catch (err) {
  console.error('[ERROR] Unable to connect to Supabase Cloud:');
  console.error('       ', err.message);
  if (err.cause?.code === 'ENOTFOUND') {
    console.error('        (Domain not found. Verify project URL or unpause project in Supabase dashboard)');
  }
}
