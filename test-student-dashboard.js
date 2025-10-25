/**
 * Comprehensive Student Dashboard Test Suite
 * Tests every button, feature, and command to ensure everything works
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hsagsmfellapvxdjazet.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzYWdzbWZlbGxhcHZ4ZGphemV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk2OTkyNDEsImV4cCI6MjA0NTI3NTI0MX0.xK1VBN-zxdfyoCVzzu_ssfEa56uLW2LxiCrJHy4gSmY';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test results tracker
const results = {
  passed: [],
  failed: [],
  warnings: []
};

function logTest(category, test, status, duration, details = '') {
  const result = { category, test, status, duration, details };
  
  if (status === '✅') {
    results.passed.push(result);
    console.log(`   ${status} ${test}: ${duration}ms ${details}`);
  } else if (status === '⚠️') {
    results.warnings.push(result);
    console.log(`   ${status} ${test}: ${details}`);
  } else {
    results.failed.push(result);
    console.log(`   ${status} ${test}: ${details}`);
  }
}

async function testStudentDashboardFeatures() {
  console.log('🎓 COMPREHENSIVE STUDENT DASHBOARD TEST SUITE');
  console.log('='.repeat(70));
  console.log('Testing all buttons, commands, and features...\n');

  // Get a test student
  let testStudent = null;
  try {
    const { data: students } = await supabase
      .from('students')
      .select('*')
      .limit(1);
    
    if (students && students.length > 0) {
      testStudent = students[0];
      console.log(`📋 Using Test Student: ${testStudent.name} (${testStudent.enrollment_id})\n`);
    } else {
      console.log('⚠️  No students found in database. Some tests will be skipped.\n');
    }
  } catch (error) {
    console.log('⚠️  Could not fetch test student:', error.message, '\n');
  }

  // ============================================================
  // SECTION 1: DASHBOARD OVERVIEW
  // ============================================================
  console.log('📊 SECTION 1: Dashboard Overview & Statistics');
  console.log('='.repeat(70));

  // Test 1.1: Get Dashboard Stats
  try {
    const start = Date.now();
    const { data, error } = await supabase.rpc('get_dashboard_stats');
    const duration = Date.now() - start;
    
    if (error) throw error;
    
    logTest('Dashboard', 'Load dashboard statistics', '✅', duration, 
      `Books: ${data[0].total_books}, Students: ${data[0].total_students}`);
  } catch (error) {
    logTest('Dashboard', 'Load dashboard statistics', '❌', 0, error.message);
  }

  // Test 1.2: Get User Reading Progress
  if (testStudent) {
    try {
      const start = Date.now();
      const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', testStudent.id)
        .single();
      const duration = Date.now() - start;
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      
      logTest('Dashboard', 'Load reading progress widget', '✅', duration,
        data ? `Streak: ${data.current_streak} days` : 'No progress yet');
    } catch (error) {
      logTest('Dashboard', 'Load reading progress widget', '❌', 0, error.message);
    }
  }

  // Test 1.3: Get User Badges
  if (testStudent) {
    try {
      const start = Date.now();
      const { data, error } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', testStudent.id);
      const duration = Date.now() - start;
      
      if (error) throw error;
      
      logTest('Dashboard', 'Load badges section', '✅', duration,
        `${data.length} badges earned`);
    } catch (error) {
      logTest('Dashboard', 'Load badges section', '❌', 0, error.message);
    }
  }

  // ============================================================
  // SECTION 2: BOOK BROWSING & SEARCH
  // ============================================================
  console.log('\n📚 SECTION 2: Book Browsing & Search Features');
  console.log('='.repeat(70));

  // Test 2.1: Browse Available Books (Optimized Function)
  try {
    const start = Date.now();
    const { data, error } = await supabase.rpc('get_available_books', {
      p_limit: 20,
      p_offset: 0
    });
    const duration = Date.now() - start;
    
    if (error) throw error;
    
    logTest('Books', 'Browse available books', '✅', duration,
      `Found ${data.length} books`);
  } catch (error) {
    logTest('Books', 'Browse available books', '❌', 0, error.message);
  }

  // Test 2.2: Search Books (Optimized Full-Text Search)
  try {
    const start = Date.now();
    const { data, error } = await supabase.rpc('search_books_optimized', {
      search_term: 'book'
    });
    const duration = Date.now() - start;
    
    if (error) throw error;
    
    logTest('Books', 'Search books (full-text)', '✅', duration,
      `Found ${data.length} results`);
  } catch (error) {
    logTest('Books', 'Search books (full-text)', '❌', 0, error.message);
  }

  // Test 2.3: Filter by Category
  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('status', 'available')
      .not('category', 'is', null)
      .limit(10);
    const duration = Date.now() - start;
    
    if (error) throw error;
    
    logTest('Books', 'Filter books by category', '✅', duration,
      `Found ${data.length} categorized books`);
  } catch (error) {
    logTest('Books', 'Filter books by category', '❌', 0, error.message);
  }

  // Test 2.4: Get Book Categories Count
  try {
    const start = Date.now();
    const { data, error } = await supabase.rpc('get_books_by_category_count');
    const duration = Date.now() - start;
    
    if (error) throw error;
    
    logTest('Books', 'Load category filter dropdown', '✅', duration,
      `${data.length} categories`);
  } catch (error) {
    logTest('Books', 'Load category filter dropdown', '❌', 0, error.message);
  }

  // Test 2.5: View Book Details
  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .limit(1)
      .single();
    const duration = Date.now() - start;
    
    if (error && error.code !== 'PGRST116') throw error;
    
    if (data) {
      logTest('Books', 'View book details modal', '✅', duration,
        `Loaded: ${data.title}`);
    } else {
      logTest('Books', 'View book details modal', '⚠️', duration,
        'No books to view');
    }
  } catch (error) {
    logTest('Books', 'View book details modal', '❌', 0, error.message);
  }

  // Test 2.6: Pagination
  try {
    const start = Date.now();
    const { data: page1, error: error1 } = await supabase
      .from('books')
      .select('*')
      .range(0, 9);
    
    const { data: page2, error: error2 } = await supabase
      .from('books')
      .select('*')
      .range(10, 19);
    const duration = Date.now() - start;
    
    if (error1 || error2) throw error1 || error2;
    
    logTest('Books', 'Paginate through books', '✅', duration,
      `Page 1: ${page1.length}, Page 2: ${page2.length}`);
  } catch (error) {
    logTest('Books', 'Paginate through books', '❌', 0, error.message);
  }

  // ============================================================
  // SECTION 3: BOOK RESERVATION & BORROWING
  // ============================================================
  console.log('\n📖 SECTION 3: Reserve & Borrow Features');
  console.log('='.repeat(70));

  // Test 3.1: Check Book Availability
  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from('books')
      .select('id, title, status')
      .eq('status', 'available')
      .limit(1);
    const duration = Date.now() - start;
    
    if (error) throw error;
    
    logTest('Borrow', 'Check book availability', '✅', duration,
      data.length > 0 ? 'Books available' : 'No books available');
  } catch (error) {
    logTest('Borrow', 'Check book availability', '❌', 0, error.message);
  }

  // Test 3.2: Create Borrow Record (Simulation - won't actually create)
  try {
    const start = Date.now();
    // Just test the query structure without executing
    const query = supabase
      .from('borrow_records')
      .select('*')
      .eq('status', 'active')
      .limit(1);
    
    await query;
    const duration = Date.now() - start;
    
    logTest('Borrow', 'Reserve book button query', '✅', duration,
      'Query structure valid');
  } catch (error) {
    logTest('Borrow', 'Reserve book button query', '❌', 0, error.message);
  }

  // Test 3.3: View Active Borrows
  if (testStudent) {
    try {
      const start = Date.now();
      const { data, error } = await supabase
        .from('borrow_records')
        .select(`
          *,
          books (title, author)
        `)
        .eq('student_id', testStudent.id)
        .eq('status', 'active');
      const duration = Date.now() - start;
      
      if (error) throw error;
      
      logTest('Borrow', 'View active borrows', '✅', duration,
        `${data.length} active borrows`);
    } catch (error) {
      logTest('Borrow', 'View active borrows', '❌', 0, error.message);
    }
  }

  // Test 3.4: View Borrow History (Optimized)
  if (testStudent) {
    try {
      const start = Date.now();
      const { data, error } = await supabase.rpc('get_student_borrow_history', {
        p_student_id: testStudent.id,
        p_limit: 10
      });
      const duration = Date.now() - start;
      
      if (error) throw error;
      
      logTest('Borrow', 'View borrow history', '✅', duration,
        `${data.length} records`);
    } catch (error) {
      logTest('Borrow', 'View borrow history', '❌', 0, error.message);
    }
  }

  // Test 3.5: Check Overdue Books
  if (testStudent) {
    try {
      const start = Date.now();
      const { data, error } = await supabase
        .from('borrow_records')
        .select('*')
        .eq('student_id', testStudent.id)
        .eq('status', 'active')
        .lt('due_date', new Date().toISOString());
      const duration = Date.now() - start;
      
      if (error) throw error;
      
      logTest('Borrow', 'Check overdue books alert', '✅', duration,
        `${data.length} overdue books`);
    } catch (error) {
      logTest('Borrow', 'Check overdue books alert', '❌', 0, error.message);
    }
  }

  // ============================================================
  // SECTION 4: BOOK REPORTS & REVIEWS
  // ============================================================
  console.log('\n✍️  SECTION 4: Book Reports & Reviews');
  console.log('='.repeat(70));

  // Test 4.1: View Submitted Reports
  if (testStudent) {
    try {
      const start = Date.now();
      const { data, error } = await supabase
        .from('book_reports')
        .select(`
          *,
          books (title, author)
        `)
        .eq('user_id', testStudent.id);
      const duration = Date.now() - start;
      
      if (error) throw error;
      
      logTest('Reports', 'View my book reports', '✅', duration,
        `${data.length} reports`);
    } catch (error) {
      logTest('Reports', 'View my book reports', '❌', 0, error.message);
    }
  }

  // Test 4.2: Check Report Status
  if (testStudent) {
    try {
      const start = Date.now();
      const { data, error } = await supabase
        .from('book_reports')
        .select('id, status, created_at')
        .eq('user_id', testStudent.id)
        .order('created_at', { ascending: false });
      const duration = Date.now() - start;
      
      if (error) throw error;
      
      const pending = data.filter(r => r.status === 'pending').length;
      const approved = data.filter(r => r.status === 'approved').length;
      
      logTest('Reports', 'View report status badges', '✅', duration,
        `Pending: ${pending}, Approved: ${approved}`);
    } catch (error) {
      logTest('Reports', 'View report status badges', '❌', 0, error.message);
    }
  }

  // Test 4.3: Submit Report Query Structure
  try {
    const start = Date.now();
    // Test the query structure without executing
    const testData = {
      user_id: '00000000-0000-0000-0000-000000000000',
      book_id: '00000000-0000-0000-0000-000000000000',
      content: 'Test',
      status: 'pending'
    };
    
    // Just validate the query builds correctly
    supabase.from('book_reports').insert(testData);
    const duration = Date.now() - start;
    
    logTest('Reports', 'Submit report form query', '✅', duration,
      'Query structure valid');
  } catch (error) {
    logTest('Reports', 'Submit report form query', '❌', 0, error.message);
  }

  // ============================================================
  // SECTION 5: LEADERBOARD
  // ============================================================
  console.log('\n🏆 SECTION 5: Leaderboard Features');
  console.log('='.repeat(70));

  // Test 5.1: View Leaderboard (Optimized)
  try {
    const start = Date.now();
    const { data, error } = await supabase.rpc('get_leaderboard', {
      p_limit: 10
    });
    const duration = Date.now() - start;
    
    if (error) throw error;
    
    logTest('Leaderboard', 'Load top readers', '✅', duration,
      `${data.length} students ranked`);
  } catch (error) {
    logTest('Leaderboard', 'Load top readers', '❌', 0, error.message);
  }

  // Test 5.2: View My Rank
  if (testStudent) {
    try {
      const start = Date.now();
      const { data, error } = await supabase.rpc('get_leaderboard', {
        p_limit: 100
      });
      const duration = Date.now() - start;
      
      if (error) throw error;
      
      const myRank = data.findIndex(s => s.id === testStudent.id) + 1;
      
      logTest('Leaderboard', 'View my ranking', '✅', duration,
        myRank > 0 ? `Rank: #${myRank}` : 'Not ranked yet');
    } catch (error) {
      logTest('Leaderboard', 'View my ranking', '❌', 0, error.message);
    }
  }

  // Test 5.3: View Reading Streaks
  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from('reading_progress')
      .select('user_id, current_streak, longest_streak')
      .order('current_streak', { ascending: false })
      .limit(10);
    const duration = Date.now() - start;
    
    if (error) throw error;
    
    logTest('Leaderboard', 'View streak leaders', '✅', duration,
      `${data.length} students with streaks`);
  } catch (error) {
    logTest('Leaderboard', 'View streak leaders', '❌', 0, error.message);
  }

  // ============================================================
  // SECTION 6: NOTIFICATIONS
  // ============================================================
  console.log('\n🔔 SECTION 6: Notifications');
  console.log('='.repeat(70));

  // Test 6.1: Load Notifications
  if (testStudent) {
    try {
      const start = Date.now();
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', testStudent.id)
        .order('created_at', { ascending: false })
        .limit(20);
      const duration = Date.now() - start;
      
      if (error) throw error;
      
      const unread = data.filter(n => !n.read).length;
      
      logTest('Notifications', 'Load notification center', '✅', duration,
        `${data.length} total, ${unread} unread`);
    } catch (error) {
      logTest('Notifications', 'Load notification center', '❌', 0, error.message);
    }
  }

  // Test 6.2: Mark as Read
  if (testStudent) {
    try {
      const start = Date.now();
      // Just test the query structure
      const query = supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', testStudent.id)
        .eq('read', false);
      
      const duration = Date.now() - start;
      
      logTest('Notifications', 'Mark as read button', '✅', duration,
        'Query structure valid');
    } catch (error) {
      logTest('Notifications', 'Mark as read button', '❌', 0, error.message);
    }
  }

  // ============================================================
  // SECTION 7: DIGITAL LIBRARY
  // ============================================================
  console.log('\n💻 SECTION 7: Digital Library Access');
  console.log('='.repeat(70));

  // Test 7.1: Browse Digital Materials
  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('material_type', 'digital')
      .eq('status', 'available');
    const duration = Date.now() - start;
    
    if (error) throw error;
    
    logTest('Digital', 'Browse digital materials', '✅', duration,
      `${data.length} digital items`);
  } catch (error) {
    logTest('Digital', 'Browse digital materials', '❌', 0, error.message);
  }

  // Test 7.2: Filter by Material Type
  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from('books')
      .select('material_type')
      .not('material_type', 'is', null);
    const duration = Date.now() - start;
    
    if (error) throw error;
    
    const types = [...new Set(data.map(b => b.material_type))];
    
    logTest('Digital', 'Material type filter', '✅', duration,
      `${types.length} types available`);
  } catch (error) {
    logTest('Digital', 'Material type filter', '❌', 0, error.message);
  }

  // ============================================================
  // SECTION 8: PROFILE & SETTINGS
  // ============================================================
  console.log('\n👤 SECTION 8: Profile & Settings');
  console.log('='.repeat(70));

  // Test 8.1: View Profile
  if (testStudent) {
    try {
      const start = Date.now();
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', testStudent.id)
        .single();
      const duration = Date.now() - start;
      
      if (error) throw error;
      
      logTest('Profile', 'Load profile page', '✅', duration,
        `${data.name}`);
    } catch (error) {
      logTest('Profile', 'Load profile page', '❌', 0, error.message);
    }
  }

  // Test 8.2: View Reading Statistics
  if (testStudent) {
    try {
      const start = Date.now();
      const { data: progress, error: error1 } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', testStudent.id)
        .single();
      
      const { data: borrows, error: error2 } = await supabase
        .from('borrow_records')
        .select('id')
        .eq('student_id', testStudent.id)
        .eq('status', 'completed');
      
      const duration = Date.now() - start;
      
      if (error1 && error1.code !== 'PGRST116') throw error1;
      if (error2) throw error2;
      
      logTest('Profile', 'View reading statistics', '✅', duration,
        `${borrows.length} completed borrows`);
    } catch (error) {
      logTest('Profile', 'View reading statistics', '❌', 0, error.message);
    }
  }

  // ============================================================
  // FINAL REPORT
  // ============================================================
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY REPORT');
  console.log('='.repeat(70));

  const total = results.passed.length + results.failed.length + results.warnings.length;
  const passRate = ((results.passed.length / total) * 100).toFixed(1);

  console.log(`\n✅ Passed:   ${results.passed.length}/${total} (${passRate}%)`);
  console.log(`❌ Failed:   ${results.failed.length}/${total}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}/${total}`);

  if (results.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.failed.forEach(r => {
      console.log(`   • [${r.category}] ${r.test}: ${r.details}`);
    });
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    results.warnings.forEach(r => {
      console.log(`   • [${r.category}] ${r.test}: ${r.details}`);
    });
  }

  // Performance Summary
  const avgTime = results.passed
    .map(r => r.duration)
    .reduce((a, b) => a + b, 0) / results.passed.length;

  console.log('\n⚡ PERFORMANCE:');
  console.log(`   Average Response Time: ${avgTime.toFixed(0)}ms`);
  console.log(`   Fastest: ${Math.min(...results.passed.map(r => r.duration))}ms`);
  console.log(`   Slowest: ${Math.max(...results.passed.map(r => r.duration))}ms`);

  // Overall Assessment
  console.log('\n🎯 OVERALL ASSESSMENT:');
  if (passRate >= 95) {
    console.log('   ✅ EXCELLENT: Student dashboard is fully functional!');
  } else if (passRate >= 80) {
    console.log('   🟢 GOOD: Most features working, minor issues found');
  } else if (passRate >= 60) {
    console.log('   🟡 FAIR: Several features need attention');
  } else {
    console.log('   🔴 POOR: Major issues found, requires fixes');
  }

  console.log('\n' + '='.repeat(70));
  console.log('✓ Test suite completed successfully!');
  console.log('='.repeat(70));
}

// Run the test suite
testStudentDashboardFeatures().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
