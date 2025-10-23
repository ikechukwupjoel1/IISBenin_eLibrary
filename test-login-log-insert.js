// Test direct login log insertion
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env file
const envContent = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogInsertion() {
  console.log('🧪 Testing direct login log insertion...\n');

  const testLog = {
    enrollment_id: 'TEST123',
    status: 'success',
    role: 'student',
    login_at: new Date().toISOString(),
    user_agent: 'Test User Agent Mozilla/5.0',
    ip_address: '192.168.1.1',
    location: 'Lagos, Nigeria',
    full_name: 'Test User'
  };

  console.log('📝 Attempting to insert:', testLog);

  const { data, error } = await supabase
    .from('login_logs')
    .insert([testLog])
    .select();

  if (error) {
    console.error('\n❌ ERROR inserting login log:');
    console.error('Message:', error.message);
    console.error('Details:', error.details);
    console.error('Hint:', error.hint);
    console.error('Code:', error.code);
    console.error('Full error:', JSON.stringify(error, null, 2));
  } else {
    console.log('\n✅ Login log inserted successfully!');
    console.log('Data:', data);
  }

  // Check if it was inserted
  const { data: allLogs, error: queryError } = await supabase
    .from('login_logs')
    .select('*')
    .order('login_at', { ascending: false })
    .limit(5);

  if (queryError) {
    console.error('\n❌ Error querying logs:', queryError);
  } else {
    console.log(`\n📊 Total recent logs: ${allLogs?.length || 0}`);
    if (allLogs && allLogs.length > 0) {
      console.log('Latest log:', allLogs[0]);
    }
  }
}

testLogInsertion().catch(console.error);
