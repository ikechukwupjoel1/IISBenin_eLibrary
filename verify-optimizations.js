/**
 * Verify Database Optimizations
 * Run this after applying migrations to confirm everything is set up
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://myxwxakwlfjoovvlkkul.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eHd4YWt3bGZqb292dmxra3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMzUzNzcsImV4cCI6MjA3NTcxMTM3N30.UJSR_IVnabXNY-ITNkU-2RxETKsLjEBYKAWxD7fKDpw';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Verifying Database Optimizations\n');
console.log('This will test if migrations were applied successfully.\n');

async function verifyOptimizations() {
  const tests = [];
  
  console.log('═══════════════════════════════════════════════════');
  console.log('📋 Testing Optimized Functions');
  console.log('═══════════════════════════════════════════════════\n');
  
  // Test 1: Check if search_books_optimized function exists
  console.log('1️⃣  Testing search_books_optimized function...');
  try {
    const start = Date.now();
    const { data, error } = await supabase.rpc('search_books_optimized', {
      search_term: 'the'
    });
    const duration = Date.now() - start;
    
    if (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      tests.push({ test: 'search_books_optimized', status: '❌ Not Found', duration: '-' });
    } else {
      console.log(`   ✅ WORKING: Found ${data?.length || 0} results in ${duration}ms`);
      tests.push({ test: 'search_books_optimized', status: '✅ Working', duration: `${duration}ms` });
    }
  } catch (e) {
    console.log(`   ❌ ERROR: ${e.message}`);
    tests.push({ test: 'search_books_optimized', status: '❌ Error', duration: '-' });
  }
  console.log('');
  
  // Test 2: Check if get_available_books function exists
  console.log('2️⃣  Testing get_available_books function...');
  try {
    const start = Date.now();
    const { data, error } = await supabase.rpc('get_available_books', {
      p_limit: 20,
      p_offset: 0
    });
    const duration = Date.now() - start;
    
    if (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      tests.push({ test: 'get_available_books', status: '❌ Not Found', duration: '-' });
    } else {
      console.log(`   ✅ WORKING: Found ${data?.length || 0} available books in ${duration}ms`);
      tests.push({ test: 'get_available_books', status: '✅ Working', duration: `${duration}ms` });
    }
  } catch (e) {
    console.log(`   ❌ ERROR: ${e.message}`);
    tests.push({ test: 'get_available_books', status: '❌ Error', duration: '-' });
  }
  console.log('');
  
  // Test 3: Check if get_dashboard_stats function exists
  console.log('3️⃣  Testing get_dashboard_stats function...');
  try {
    const start = Date.now();
    const { data, error } = await supabase.rpc('get_dashboard_stats');
    const duration = Date.now() - start;
    
    if (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      tests.push({ test: 'get_dashboard_stats', status: '❌ Not Found', duration: '-' });
    } else {
      console.log(`   ✅ WORKING: Retrieved stats in ${duration}ms`);
      if (data && data.length > 0) {
        console.log(`      📊 Books: ${data[0].total_books}, Students: ${data[0].total_students}`);
      }
      tests.push({ test: 'get_dashboard_stats', status: '✅ Working', duration: `${duration}ms` });
    }
  } catch (e) {
    console.log(`   ❌ ERROR: ${e.message}`);
    tests.push({ test: 'get_dashboard_stats', status: '❌ Error', duration: '-' });
  }
  console.log('');
  
  // Test 4: Check if get_leaderboard function exists
  console.log('4️⃣  Testing get_leaderboard function...');
  try {
    const start = Date.now();
    const { data, error } = await supabase.rpc('get_leaderboard', {
      p_limit: 10
    });
    const duration = Date.now() - start;
    
    if (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      tests.push({ test: 'get_leaderboard', status: '❌ Not Found', duration: '-' });
    } else {
      console.log(`   ✅ WORKING: Found ${data?.length || 0} students in leaderboard in ${duration}ms`);
      tests.push({ test: 'get_leaderboard', status: '✅ Working', duration: `${duration}ms` });
    }
  } catch (e) {
    console.log(`   ❌ ERROR: ${e.message}`);
    tests.push({ test: 'get_leaderboard', status: '❌ Error', duration: '-' });
  }
  console.log('');
  
  // Test 5: Test regular query with indexes
  console.log('5️⃣  Testing indexed query (status filter)...');
  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('status', 'available')
      .limit(20);
    const duration = Date.now() - start;
    
    if (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      tests.push({ test: 'Indexed status filter', status: '❌ Error', duration: '-' });
    } else {
      console.log(`   ✅ WORKING: Query completed in ${duration}ms`);
      tests.push({ test: 'Indexed status filter', status: '✅ Working', duration: `${duration}ms` });
    }
  } catch (e) {
    console.log(`   ❌ ERROR: ${e.message}`);
    tests.push({ test: 'Indexed status filter', status: '❌ Error', duration: '-' });
  }
  console.log('');
  
  // Summary
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 VERIFICATION SUMMARY');
  console.log('═══════════════════════════════════════════════════\n');
  
  console.table(tests);
  
  const workingCount = tests.filter(t => t.status.includes('✅')).length;
  const totalTests = tests.length;
  
  console.log('\n📈 Results:');
  console.log(`   Working: ${workingCount}/${totalTests} tests passed`);
  
  if (workingCount === totalTests) {
    console.log('\n✅ ALL OPTIMIZATIONS APPLIED SUCCESSFULLY!');
    console.log('   Your database is now optimized for performance.');
    console.log('   You can now run: node stress-test.js');
  } else if (workingCount === 0) {
    console.log('\n❌ NO OPTIMIZATIONS DETECTED');
    console.log('\n💡 Action Required:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Copy and run: supabase/migrations/20251025_performance_optimization.sql');
    console.log('   3. Copy and run: supabase/migrations/20251025_optimized_queries.sql');
    console.log('   4. Run this verification script again');
  } else {
    console.log('\n⚠️  PARTIAL OPTIMIZATION');
    console.log(`   ${workingCount} tests passed, ${totalTests - workingCount} failed`);
    console.log('\n💡 Action Required:');
    console.log('   Check which functions failed and rerun that migration');
  }
  
  console.log('\n═══════════════════════════════════════════════════\n');
}

verifyOptimizations().catch(console.error);
