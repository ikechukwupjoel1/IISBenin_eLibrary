// Test login logs count
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env file manually
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

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLoginLogs() {
  console.log('🔍 Checking login logs...\n');

  // Get total count
  const { count: totalCount, error: countError } = await supabase
    .from('login_logs')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Error counting login logs:', countError);
    return;
  }

  console.log(`📊 Total login logs in database: ${totalCount}`);

  // Get recent logs
  const { data: recentLogs, error: logsError } = await supabase
    .from('login_logs')
    .select('*')
    .order('login_at', { ascending: false })
    .limit(10);

  if (logsError) {
    console.error('❌ Error fetching recent logs:', logsError);
    return;
  }

  console.log(`\n📋 Recent ${recentLogs?.length || 0} login logs:`);
  
  if (recentLogs && recentLogs.length > 0) {
    recentLogs.forEach((log, index) => {
      console.log(`\n${index + 1}. Login at: ${new Date(log.login_at).toLocaleString()}`);
      console.log(`   User ID: ${log.user_id || 'N/A'}`);
      console.log(`   Enrollment ID: ${log.enrollment_id || 'N/A'}`);
      console.log(`   Status: ${log.status || 'N/A'}`);
      console.log(`   Role: ${log.role || 'N/A'}`);
      console.log(`   IP: ${log.ip_address || 'N/A'}`);
      console.log(`   Location: ${log.location || 'N/A'}`);
      console.log(`   User Agent: ${log.user_agent ? log.user_agent.substring(0, 60) + '...' : 'N/A'}`);
    });
  } else {
    console.log('   No logs found!');
  }

  // Check logs created today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: todayLogs, error: todayError } = await supabase
    .from('login_logs')
    .select('*')
    .gte('login_at', today.toISOString());

  if (todayError) {
    console.error('\n❌ Error fetching today\'s logs:', todayError);
  } else {
    console.log(`\n📅 Login logs created today: ${todayLogs?.length || 0}`);
  }

  // Check logs by status
  const { data: successLogs } = await supabase
    .from('login_logs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'success');

  const { data: failedLogs } = await supabase
    .from('login_logs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed');

  console.log('\n📊 Status breakdown:');
  console.log(`   ✅ Success: ${successLogs || 0}`);
  console.log(`   ❌ Failed: ${failedLogs || 0}`);
}

testLoginLogs().catch(console.error);
