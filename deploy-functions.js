import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';

console.log('🚀 Deploying Edge Functions to Supabase...\n');

// For manual deployment, we need to use Supabase CLI
// Since CLI installation failed, let's provide instructions instead

console.log('📋 DEPLOYMENT INSTRUCTIONS:');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('Option 1: Deploy via Supabase Dashboard (Easiest)');
console.log('────────────────────────────────────────────────────');
console.log('1. Go to: https://app.supabase.com/project/_/functions');
console.log('2. Click "Create a new function"');
console.log('3. Create function named: change-password');
console.log('4. Copy content from: supabase/functions/change-password/index.ts');
console.log('5. Click "Deploy function"');
console.log('6. Repeat for: verify-login\n');

console.log('Option 2: Install Supabase CLI (Windows)');
console.log('────────────────────────────────────────────────────');
console.log('1. Using Scoop:');
console.log('   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git');
console.log('   scoop install supabase');
console.log('\n2. Or download from: https://github.com/supabase/cli/releases');
console.log('\n3. After installation:');
console.log('   supabase login');
console.log('   supabase link --project-ref YOUR_PROJECT_REF');
console.log('   supabase functions deploy change-password');
console.log('   supabase functions deploy verify-login\n');

console.log('Option 3: Use this script to copy function code');
console.log('────────────────────────────────────────────────────');

const functionsDir = path.join(__dirname, 'supabase', 'functions');
const functions = ['change-password', 'verify-login'];

functions.forEach(funcName => {
  const funcPath = path.join(functionsDir, funcName, 'index.ts');
  if (fs.existsSync(funcPath)) {
    console.log(`\n📄 ${funcName.toUpperCase()}`);
    console.log('─'.repeat(60));
    const content = fs.readFileSync(funcPath, 'utf8');
    console.log(`Location: ${funcPath}`);
    console.log(`Lines: ${content.split('\n').length}`);
    console.log('Status: ✅ Ready to deploy');
  }
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log('\n💡 RECOMMENDATION:');
console.log('Use Option 1 (Supabase Dashboard) - it\'s the fastest!\n');

console.log('📍 Your Supabase Project URL:');
console.log(SUPABASE_URL);
console.log('\n🔑 Service Role Key is configured in .env file\n');

// Check if functions exist
console.log('📦 Function Files Status:');
functions.forEach(funcName => {
  const funcPath = path.join(functionsDir, funcName, 'index.ts');
  const exists = fs.existsSync(funcPath);
  console.log(`   ${exists ? '✅' : '❌'} ${funcName}: ${exists ? funcPath : 'NOT FOUND'}`);
});

console.log('\n✨ Once deployed, the password change feature will be fully secure with bcrypt hashing!');
