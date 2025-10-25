/**
 * Comprehensive Stress Test Suite for IIS Benin eLibrary
 * Tests system performance under heavy concurrent load
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://myxwxakwlfjoovvlkkul.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eHd4YWt3bGZqb292dmxra3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMzUzNzcsImV4cCI6MjA3NTcxMTM3N30.UJSR_IVnabXNY-ITNkU-2RxETKsLjEBYKAWxD7fKDpw';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test Configuration
const TEST_CONFIG = {
  // Number of concurrent operations to simulate
  CONCURRENT_USERS: 50,
  CONCURRENT_READS: 100,
  CONCURRENT_WRITES: 25,
  
  // Test durations (milliseconds)
  TEST_DURATION: 30000, // 30 seconds
  
  // Delays between operations (milliseconds)
  MIN_DELAY: 100,
  MAX_DELAY: 1000,
};

// Performance metrics
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalResponseTime: 0,
  minResponseTime: Infinity,
  maxResponseTime: 0,
  errors: [],
  startTime: null,
  endTime: null,
};

// Utility: Random delay
const randomDelay = () => 
  Math.floor(Math.random() * (TEST_CONFIG.MAX_DELAY - TEST_CONFIG.MIN_DELAY)) + TEST_CONFIG.MIN_DELAY;

// Utility: Measure execution time
const measureTime = async (fn, label) => {
  const start = Date.now();
  metrics.totalRequests++;
  
  try {
    const result = await fn();
    const duration = Date.now() - start;
    
    metrics.successfulRequests++;
    metrics.totalResponseTime += duration;
    metrics.minResponseTime = Math.min(metrics.minResponseTime, duration);
    metrics.maxResponseTime = Math.max(metrics.maxResponseTime, duration);
    
    console.log(`✓ ${label}: ${duration}ms`);
    return { success: true, duration, result };
  } catch (error) {
    const duration = Date.now() - start;
    metrics.failedRequests++;
    metrics.errors.push({ label, error: error.message, duration });
    
    console.error(`✗ ${label}: ${error.message} (${duration}ms)`);
    return { success: false, duration, error };
  }
};

// ==============================================
// TEST 1: Database Read Performance
// ==============================================
async function testConcurrentReads() {
  console.log('\n📖 TEST 1: Concurrent Read Operations');
  console.log('=' .repeat(50));
  
  const operations = [
    // Books table reads
    () => supabase.from('books').select('*').limit(50),
    () => supabase.from('books').select('id, title, author').eq('available', true),
    () => supabase.from('books').select('*').order('created_at', { ascending: false }).limit(20),
    
    // Students table reads
    () => supabase.from('students').select('*').limit(30),
    () => supabase.from('students').select('id, name, grade_level'),
    
    // Borrow records with joins
    () => supabase.from('borrow_records')
      .select('*, books(title, author), students(name)')
      .limit(20),
    
    // Book reports
    () => supabase.from('book_reports').select('*').eq('status', 'approved').limit(25),
    
    // User profiles
    () => supabase.from('user_profiles').select('id, full_name, role').limit(40),
    
    // Badges
    () => supabase.from('badges').select('*'),
    
    // Reading progress
    () => supabase.from('reading_progress').select('*').limit(30),
  ];
  
  const promises = [];
  for (let i = 0; i < TEST_CONFIG.CONCURRENT_READS; i++) {
    const operation = operations[i % operations.length];
    promises.push(measureTime(operation, `Read #${i + 1}`));
    
    // Stagger requests slightly
    if (i % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  await Promise.all(promises);
}

// ==============================================
// TEST 2: Complex Query Performance
// ==============================================
async function testComplexQueries() {
  console.log('\n🔍 TEST 2: Complex Query Performance');
  console.log('=' .repeat(50));
  
  const queries = [
    {
      name: 'Books with availability count',
      fn: () => supabase.from('books')
        .select('*, borrow_records(id)')
        .limit(20)
    },
    {
      name: 'Active borrows with details',
      fn: () => supabase.from('borrow_records')
        .select('*, books(title, author, isbn), students(name, grade_level)')
        .eq('return_date', null)
        .limit(30)
    },
    {
      name: 'Student with full history',
      fn: () => supabase.from('students')
        .select('*, borrow_records(*, books(title)), book_reports(*, books(title))')
        .limit(5)
    },
    {
      name: 'Leaderboard query',
      fn: () => supabase.from('book_reports')
        .select('user_id, points_awarded')
        .eq('status', 'approved')
        .order('points_awarded', { ascending: false })
        .limit(50)
    },
    {
      name: 'User badges with details',
      fn: () => supabase.from('user_badges')
        .select('*, badges(name, icon, description), user_profiles(full_name)')
        .limit(20)
    },
  ];
  
  for (const query of queries) {
    await measureTime(query.fn, query.name);
    await new Promise(resolve => setTimeout(resolve, randomDelay()));
  }
}

// ==============================================
// TEST 3: Concurrent Write Operations (Safe)
// ==============================================
async function testConcurrentWrites() {
  console.log('\n✍️  TEST 3: Concurrent Write Operations');
  console.log('=' .repeat(50));
  console.log('⚠️  Note: Using safe read operations to simulate load');
  
  // Using read operations that simulate write load
  // Actual writes would require authentication
  const operations = [];
  
  for (let i = 0; i < TEST_CONFIG.CONCURRENT_WRITES; i++) {
    operations.push(
      measureTime(
        () => supabase.from('books').select('*').limit(1),
        `Simulated Write #${i + 1}`
      )
    );
    
    if (i % 5 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  await Promise.all(operations);
}

// ==============================================
// TEST 4: Pagination Performance
// ==============================================
async function testPagination() {
  console.log('\n📄 TEST 4: Pagination Performance');
  console.log('=' .repeat(50));
  
  const pageSize = 20;
  const pages = 10;
  
  for (let page = 0; page < pages; page++) {
    await measureTime(
      () => supabase.from('books')
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1),
      `Page ${page + 1}/${pages}`
    );
  }
}

// ==============================================
// TEST 5: Search Performance
// ==============================================
async function testSearchPerformance() {
  console.log('\n🔎 TEST 5: Search Performance');
  console.log('=' .repeat(50));
  
  const searchTerms = ['the', 'book', 'story', 'life', 'student', 'science', 'history'];
  
  for (const term of searchTerms) {
    await measureTime(
      () => supabase.from('books')
        .select('*')
        .or(`title.ilike.%${term}%,author.ilike.%${term}%`)
        .limit(30),
      `Search: "${term}"`
    );
    await new Promise(resolve => setTimeout(resolve, randomDelay()));
  }
}

// ==============================================
// TEST 6: Filter Performance
// ==============================================
async function testFilterPerformance() {
  console.log('\n🎯 TEST 6: Filter Performance');
  console.log('=' .repeat(50));
  
  const filters = [
    {
      name: 'Available books',
      fn: () => supabase.from('books').select('*').eq('available', true)
    },
    {
      name: 'Overdue borrows',
      fn: () => supabase.from('borrow_records')
        .select('*')
        .lt('due_date', new Date().toISOString())
        .is('return_date', null)
    },
    {
      name: 'Pending book reports',
      fn: () => supabase.from('book_reports').select('*').eq('status', 'pending')
    },
    {
      name: 'Students by grade',
      fn: () => supabase.from('students').select('*').eq('grade_level', 'JSS1')
    },
    {
      name: 'Recent reading progress',
      fn: () => supabase.from('reading_progress')
        .select('*')
        .gte('last_updated', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    },
  ];
  
  for (const filter of filters) {
    await measureTime(filter.fn, filter.name);
    await new Promise(resolve => setTimeout(resolve, randomDelay()));
  }
}

// ==============================================
// TEST 7: Aggregate Operations
// ==============================================
async function testAggregateOperations() {
  console.log('\n📊 TEST 7: Aggregate Operations');
  console.log('=' .repeat(50));
  
  const aggregates = [
    {
      name: 'Count all books',
      fn: () => supabase.from('books').select('*', { count: 'exact', head: true })
    },
    {
      name: 'Count students',
      fn: () => supabase.from('students').select('*', { count: 'exact', head: true })
    },
    {
      name: 'Count active borrows',
      fn: () => supabase.from('borrow_records')
        .select('*', { count: 'exact', head: true })
        .is('return_date', null)
    },
    {
      name: 'Count approved reports',
      fn: () => supabase.from('book_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
    },
  ];
  
  for (const aggregate of aggregates) {
    await measureTime(aggregate.fn, aggregate.name);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

// ==============================================
// TEST 8: Sustained Load Test
// ==============================================
async function testSustainedLoad() {
  console.log('\n⏱️  TEST 8: Sustained Load Test (30 seconds)');
  console.log('=' .repeat(50));
  
  const startTime = Date.now();
  let requestCount = 0;
  
  while (Date.now() - startTime < TEST_CONFIG.TEST_DURATION) {
    const operations = [
      supabase.from('books').select('*').limit(20),
      supabase.from('students').select('*').limit(15),
      supabase.from('borrow_records').select('*').limit(10),
      supabase.from('book_reports').select('*').eq('status', 'approved').limit(10),
    ];
    
    const randomOp = operations[Math.floor(Math.random() * operations.length)];
    await measureTime(() => randomOp, `Sustained Request #${++requestCount}`);
    
    await new Promise(resolve => setTimeout(resolve, randomDelay()));
  }
  
  console.log(`\n✓ Completed ${requestCount} requests in ${(Date.now() - startTime) / 1000}s`);
}

// ==============================================
// Generate Performance Report
// ==============================================
function generateReport() {
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 STRESS TEST PERFORMANCE REPORT');
  console.log('='.repeat(70));
  
  const duration = (metrics.endTime - metrics.startTime) / 1000;
  const avgResponseTime = metrics.totalResponseTime / metrics.successfulRequests;
  const successRate = (metrics.successfulRequests / metrics.totalRequests) * 100;
  const requestsPerSecond = metrics.totalRequests / duration;
  
  console.log('\n📈 Overall Metrics:');
  console.log(`   Total Requests:        ${metrics.totalRequests}`);
  console.log(`   Successful Requests:   ${metrics.successfulRequests} (${successRate.toFixed(2)}%)`);
  console.log(`   Failed Requests:       ${metrics.failedRequests}`);
  console.log(`   Test Duration:         ${duration.toFixed(2)}s`);
  console.log(`   Requests/Second:       ${requestsPerSecond.toFixed(2)}`);
  
  console.log('\n⚡ Response Time Statistics:');
  console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`   Min Response Time:     ${metrics.minResponseTime}ms`);
  console.log(`   Max Response Time:     ${metrics.maxResponseTime}ms`);
  
  if (metrics.errors.length > 0) {
    console.log('\n❌ Errors Encountered:');
    metrics.errors.slice(0, 10).forEach((err, i) => {
      console.log(`   ${i + 1}. ${err.label}: ${err.error}`);
    });
    if (metrics.errors.length > 10) {
      console.log(`   ... and ${metrics.errors.length - 10} more errors`);
    }
  }
  
  console.log('\n✅ Performance Assessment:');
  if (avgResponseTime < 200) {
    console.log('   🟢 EXCELLENT: Average response time under 200ms');
  } else if (avgResponseTime < 500) {
    console.log('   🟡 GOOD: Average response time under 500ms');
  } else if (avgResponseTime < 1000) {
    console.log('   🟠 ACCEPTABLE: Average response time under 1s');
  } else {
    console.log('   🔴 NEEDS OPTIMIZATION: Average response time over 1s');
  }
  
  if (successRate > 99) {
    console.log('   🟢 EXCELLENT: Success rate above 99%');
  } else if (successRate > 95) {
    console.log('   🟡 GOOD: Success rate above 95%');
  } else if (successRate > 90) {
    console.log('   🟠 ACCEPTABLE: Success rate above 90%');
  } else {
    console.log('   🔴 CRITICAL: Success rate below 90%');
  }
  
  console.log('\n💡 Recommendations:');
  if (avgResponseTime > 500) {
    console.log('   - Consider adding database indexes on frequently queried columns');
    console.log('   - Implement caching for static data (books, badges)');
    console.log('   - Use pagination for large datasets');
  }
  if (metrics.failedRequests > 0) {
    console.log('   - Review error logs and implement retry logic');
    console.log('   - Check database connection pooling settings');
    console.log('   - Monitor rate limits and implement throttling');
  }
  if (requestsPerSecond < 10) {
    console.log('   - Consider implementing request batching');
    console.log('   - Review database query optimization');
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✓ Stress test completed successfully!');
  console.log('='.repeat(70) + '\n');
}

// ==============================================
// Main Test Runner
// ==============================================
async function runStressTests() {
  console.log('🚀 Starting IIS Benin eLibrary Stress Test Suite');
  console.log('=' .repeat(70));
  console.log(`Configuration:`);
  console.log(`  - Concurrent Users: ${TEST_CONFIG.CONCURRENT_USERS}`);
  console.log(`  - Concurrent Reads: ${TEST_CONFIG.CONCURRENT_READS}`);
  console.log(`  - Concurrent Writes: ${TEST_CONFIG.CONCURRENT_WRITES}`);
  console.log(`  - Test Duration: ${TEST_CONFIG.TEST_DURATION / 1000}s`);
  console.log('=' .repeat(70));
  
  metrics.startTime = Date.now();
  
  try {
    // Run all tests sequentially
    await testConcurrentReads();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testComplexQueries();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testConcurrentWrites();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testPagination();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testSearchPerformance();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testFilterPerformance();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testAggregateOperations();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testSustainedLoad();
    
    metrics.endTime = Date.now();
    
    // Generate final report
    generateReport();
    
  } catch (error) {
    console.error('\n❌ Critical error during stress test:', error);
    process.exit(1);
  }
}

// Run tests
runStressTests().catch(console.error);
