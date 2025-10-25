/**
 * Quick Performance Comparison Test
 * Tests the React app to see immediate improvements from caching
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://myxwxakwlfjoovvlkkul.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eHd4YWt3bGZqb292dmxra3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMzUzNzcsImV4cCI6MjA3NTcxMTM3N30.UJSR_IVnabXNY-ITNkU-2RxETKsLjEBYKAWxD7fKDpw';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🎯 Quick Performance Comparison');
console.log('Testing current state WITHOUT database optimizations');
console.log('(Migrations not yet applied - testing baseline)\n');

async function testQuickOperations() {
  const results = [];
  
  // Test 1: Simple book query
  console.log('📖 Test 1: Fetch 20 books...');
  let start = Date.now();
  const { data: books } = await supabase
    .from('books')
    .select('*')
    .limit(20);
  let duration = Date.now() - start;
  results.push({ test: 'Fetch 20 books', duration: `${duration}ms` });
  console.log(`   ✓ Completed in ${duration}ms\n`);
  
  // Test 2: Status filter query
  console.log('📚 Test 2: Filter available books...');
  start = Date.now();
  const { data: available } = await supabase
    .from('books')
    .select('*')
    .eq('status', 'available')
    .limit(20);
  duration = Date.now() - start;
  results.push({ test: 'Filter available books', duration: `${duration}ms` });
  console.log(`   ✓ Completed in ${duration}ms\n`);
  
  // Test 3: Search query (slow without indexes)
  console.log('🔍 Test 3: Search for "the"...');
  start = Date.now();
  const { data: searchResults } = await supabase
    .from('books')
    .select('*')
    .or('title.ilike.%the%,author.ilike.%the%')
    .limit(20);
  duration = Date.now() - start;
  results.push({ test: 'Search books (LIKE)', duration: `${duration}ms` });
  console.log(`   ✓ Completed in ${duration}ms\n`);
  
  // Test 4: Count students
  console.log('👥 Test 4: Count students...');
  start = Date.now();
  const { count: studentCount } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });
  duration = Date.now() - start;
  results.push({ test: 'Count students', duration: `${duration}ms` });
  console.log(`   ✓ Completed in ${duration}ms\n`);
  
  // Test 5: Active borrows
  console.log('📋 Test 5: Fetch active borrows...');
  start = Date.now();
  const { data: activeBorrows } = await supabase
    .from('borrow_records')
    .select(`
      *,
      books (title, author),
      students (name)
    `)
    .eq('status', 'active')
    .limit(20);
  duration = Date.now() - start;
  results.push({ test: 'Active borrows with joins', duration: `${duration}ms` });
  console.log(`   ✓ Completed in ${duration}ms\n`);
  
  // Summary
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 BASELINE PERFORMANCE SUMMARY');
  console.log('═══════════════════════════════════════════════════\n');
  
  console.table(results);
  
  const totalTime = results.reduce((sum, r) => sum + parseInt(r.duration), 0);
  const avgTime = Math.round(totalTime / results.length);
  
  console.log('\n📈 Statistics:');
  console.log(`   Total Time: ${totalTime}ms`);
  console.log(`   Average Time: ${avgTime}ms`);
  console.log(`   Tests Run: ${results.length}`);
  
  console.log('\n💡 Next Steps:');
  console.log('   1. Apply database migrations in Supabase SQL Editor');
  console.log('   2. Run this test again to see improvements');
  console.log('   3. Expected: 50-80% reduction in query times');
  console.log('\n   Migrations to apply:');
  console.log('   • supabase/migrations/20251025_performance_optimization.sql');
  console.log('   • supabase/migrations/20251025_optimized_queries.sql');
  
  console.log('\n✅ Baseline test complete!');
}

testQuickOperations().catch(console.error);
