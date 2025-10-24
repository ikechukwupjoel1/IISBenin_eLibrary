// COMPREHENSIVE SYSTEM TEST SCRIPT
// Run this in browser console at http://localhost:5173/ after logging in as librarian

(async () => {
  console.log('🚀 STARTING COMPREHENSIVE SYSTEM TEST');
  console.log('=====================================\n');

  const results = {
    passed: [],
    failed: [],
    warnings: [],
    critical: []
  };

  // Helper function to test database table access
  const testTableAccess = async (tableName, selectFields = '*') => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select(selectFields)
        .limit(5);
      
      if (error) {
        results.failed.push(`❌ ${tableName}: ${error.message}`);
        return { success: false, error };
      }
      
      results.passed.push(`✅ ${tableName}: Accessible (${data?.length || 0} records)`);
      return { success: true, data };
    } catch (err) {
      results.failed.push(`❌ ${tableName}: ${err.message}`);
      return { success: false, error: err };
    }
  };

  // ============================================
  // TEST 1: DATABASE CONNECTIVITY & TABLE ACCESS
  // ============================================
  console.log('📊 TEST 1: Database Connectivity & Table Access');
  console.log('-----------------------------------------------');

  const tables = [
    'books',
    'students',
    'staff',
    'user_profiles',
    'borrow_records',
    'reservations',
    'book_reviews',
    'reading_challenges',
    'book_clubs',
    'waiting_lists',
    'messages',
    'message_attachments',
    'message_reactions',
    'login_logs',
    'notification_preferences',
    'book_recommendations',
    'reading_streaks'
  ];

  for (const table of tables) {
    await testTableAccess(table);
  }

  console.log('\n');

  // ============================================
  // TEST 2: AUTHENTICATION STATUS
  // ============================================
  console.log('🔐 TEST 2: Authentication Status');
  console.log('--------------------------------');

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (session) {
      console.log('✅ Session active:', session.user.email);
      results.passed.push('Authentication: Session active');
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profile) {
        console.log('✅ User profile loaded:', profile.role, '-', profile.full_name);
        results.passed.push(`User profile: ${profile.role} - ${profile.full_name}`);
        
        if (profile.role !== 'librarian') {
          results.warnings.push('⚠️ Current user is not a librarian - some tests may be restricted');
        }
      }
    } else {
      console.error('❌ No active session');
      results.failed.push('Authentication: No active session');
    }
  } catch (error) {
    console.error('❌ Auth check failed:', error);
    results.failed.push(`Authentication: ${error.message}`);
  }

  console.log('\n');

  // ============================================
  // TEST 3: RLS POLICIES (Librarian-specific)
  // ============================================
  console.log('🔒 TEST 3: RLS Policies & Permissions');
  console.log('-------------------------------------');

  // Test insert permission on books table
  try {
    const testBook = {
      title: 'TEST_BOOK_DELETE_ME',
      author: 'Test Author',
      isbn: '9999999999999',
      category: 'Test',
      quantity: 1,
      available_quantity: 1
    };

    const { data, error } = await supabase
      .from('books')
      .insert(testBook)
      .select()
      .single();

    if (error) {
      if (error.code === '42501') {
        results.critical.push('🚨 CRITICAL: Cannot insert books - RLS policy issue');
      }
      results.failed.push(`❌ Book insert: ${error.message}`);
    } else {
      results.passed.push('✅ Book insert: Permission granted');
      
      // Clean up test book
      await supabase.from('books').delete().eq('id', data.id);
      console.log('  ↳ Test book deleted');
    }
  } catch (err) {
    results.failed.push(`❌ Book insert test failed: ${err.message}`);
  }

  console.log('\n');

  // ============================================
  // TEST 4: STORAGE BUCKET ACCESS
  // ============================================
  console.log('📁 TEST 4: Storage Bucket Access');
  console.log('--------------------------------');

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      results.failed.push(`❌ Storage buckets: ${error.message}`);
    } else {
      console.log('✅ Storage accessible, buckets:', buckets.map(b => b.name).join(', '));
      results.passed.push(`Storage buckets: ${buckets.length} found`);
      
      // Check for message-attachments bucket
      const hasMessageBucket = buckets.some(b => b.name === 'message-attachments');
      if (hasMessageBucket) {
        results.passed.push('✅ message-attachments bucket exists');
      } else {
        results.warnings.push('⚠️ message-attachments bucket not found');
      }
    }
  } catch (err) {
    results.failed.push(`❌ Storage check: ${err.message}`);
  }

  console.log('\n');

  // ============================================
  // TEST 5: EDGE FUNCTIONS AVAILABILITY
  // ============================================
  console.log('⚡ TEST 5: Edge Functions');
  console.log('-------------------------');

  const edgeFunctions = [
    'create-user-account',
    'verify-login',
    'change-password'
  ];

  for (const funcName of edgeFunctions) {
    try {
      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/${funcName}`,
        {
          method: 'OPTIONS',
          headers: {
            'apikey': supabase.supabaseKey
          }
        }
      );
      
      if (response.status === 200 || response.status === 204) {
        results.passed.push(`✅ Edge function: ${funcName}`);
      } else {
        results.warnings.push(`⚠️ Edge function may not be deployed: ${funcName}`);
      }
    } catch (err) {
      results.warnings.push(`⚠️ Edge function check failed: ${funcName}`);
    }
  }

  console.log('\n');

  // ============================================
  // TEST 6: CRITICAL FUNCTIONS EXIST
  // ============================================
  console.log('🔧 TEST 6: Database Functions');
  console.log('------------------------------');

  try {
    const { data, error } = await supabase.rpc('is_librarian', { 
      user_id: (await supabase.auth.getUser()).data.user.id 
    });
    
    if (error) {
      results.failed.push(`❌ is_librarian function: ${error.message}`);
    } else {
      results.passed.push(`✅ is_librarian function: Returns ${data}`);
    }
  } catch (err) {
    results.failed.push(`❌ is_librarian function: ${err.message}`);
  }

  console.log('\n');

  // ============================================
  // TEST 7: DATA INTEGRITY CHECKS
  // ============================================
  console.log('📋 TEST 7: Data Integrity');
  console.log('-------------------------');

  // Check for orphaned records
  try {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, student_id, staff_id, role');
    
    let orphaned = 0;
    
    for (const profile of profiles || []) {
      if (profile.role === 'student' && profile.student_id) {
        const { data: student } = await supabase
          .from('students')
          .select('id')
          .eq('id', profile.student_id)
          .single();
        
        if (!student) orphaned++;
      }
      
      if (profile.role === 'staff' && profile.staff_id) {
        const { data: staff } = await supabase
          .from('staff')
          .select('id')
          .eq('id', profile.staff_id)
          .single();
        
        if (!staff) orphaned++;
      }
    }
    
    if (orphaned > 0) {
      results.warnings.push(`⚠️ Found ${orphaned} orphaned user profiles`);
    } else {
      results.passed.push('✅ No orphaned user profiles');
    }
  } catch (err) {
    results.warnings.push(`⚠️ Integrity check error: ${err.message}`);
  }

  console.log('\n');

  // ============================================
  // TEST 8: SEARCH FUNCTIONALITY
  // ============================================
  console.log('🔍 TEST 8: Search Functionality');
  console.log('-------------------------------');

  try {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .ilike('title', '%test%')
      .limit(5);
    
    if (error) {
      results.failed.push(`❌ Book search: ${error.message}`);
    } else {
      results.passed.push(`✅ Book search: Works (${data?.length || 0} results)`);
    }
  } catch (err) {
    results.failed.push(`❌ Book search: ${err.message}`);
  }

  console.log('\n');

  // ============================================
  // FINAL REPORT
  // ============================================
  console.log('\n');
  console.log('═══════════════════════════════════════════');
  console.log('📊 COMPREHENSIVE TEST RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════\n');

  console.log('✅ PASSED TESTS (' + results.passed.length + ')');
  console.log('─────────────────');
  results.passed.forEach(msg => console.log(msg));
  console.log('\n');

  if (results.critical.length > 0) {
    console.log('🚨 CRITICAL ISSUES (' + results.critical.length + ') - BLOCKS LAUNCH');
    console.log('────────────────────────────────────────────────');
    results.critical.forEach(msg => console.log(msg));
    console.log('\n');
  }

  if (results.failed.length > 0) {
    console.log('❌ FAILED TESTS (' + results.failed.length + ')');
    console.log('────────────────');
    results.failed.forEach(msg => console.log(msg));
    console.log('\n');
  }

  if (results.warnings.length > 0) {
    console.log('⚠️  WARNINGS (' + results.warnings.length + ')');
    console.log('────────────');
    results.warnings.forEach(msg => console.log(msg));
    console.log('\n');
  }

  // Calculate health score
  const total = results.passed.length + results.failed.length;
  const score = total > 0 ? Math.round((results.passed.length / total) * 100) : 0;
  const hasCritical = results.critical.length > 0;

  console.log('═══════════════════════════════════════════');
  console.log('🎯 SYSTEM HEALTH SCORE: ' + score + '/100');
  
  if (hasCritical) {
    console.log('⚠️  LAUNCH STATUS: 🚫 BLOCKED (Critical issues found)');
  } else if (score >= 90 && results.failed.length === 0) {
    console.log('✅ LAUNCH STATUS: READY ');
  } else if (score >= 70) {
    console.log('⚠️  LAUNCH STATUS: NEEDS FIXES (proceed with caution)');
  } else {
    console.log('❌ LAUNCH STATUS: NOT READY');
  }
  
  console.log('═══════════════════════════════════════════\n');

  console.log('📝 NEXT STEPS:');
  console.log('1. Review all failed tests and critical issues');
  console.log('2. Fix critical issues before launch');
  console.log('3. Address high-priority failures');
  console.log('4. Test manually: Book operations, Student/Staff creation, Borrowing');
  console.log('5. Test mobile responsiveness');
  console.log('6. Performance testing with larger datasets');
  console.log('\n');

  console.log('💡 TIP: Open E2E_TEST_RESULTS.md to track manual testing progress');
  console.log('\n');

  return {
    score,
    passed: results.passed.length,
    failed: results.failed.length,
    warnings: results.warnings.length,
    critical: results.critical.length,
    launchReady: !hasCritical && score >= 90 && results.failed.length === 0
  };
})();
