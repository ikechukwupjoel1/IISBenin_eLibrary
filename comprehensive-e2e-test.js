/**
 * Comprehensive End-to-End Test Script
 * Run this in the browser console when logged in as admin (iksotech@gmail.com)
 * 
 * This tests all major features and reports what works vs what's broken
 */

(async function runComprehensiveTest() {
  console.log('🔍 STARTING COMPREHENSIVE E2E TEST');
  console.log('=====================================\n');

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  // Get Supabase client from the app
  const { supabase } = await import('./src/lib/supabase.ts');

  // ============================================
  // TEST 1: Check Authentication
  // ============================================
  console.log('TEST 1: Authentication Check');
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    
    if (session) {
      console.log('✅ User is authenticated:', session.user.email);
      results.passed.push('Authentication: User session active');
      
      // Check user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        console.error('❌ Failed to fetch user profile:', profileError);
        results.failed.push(`User profile fetch: ${profileError.message}`);
      } else {
        console.log('✅ User profile loaded:', profile);
        results.passed.push(`User profile: ${profile.role} - ${profile.full_name}`);
        
        if (profile.role !== 'librarian') {
          results.warnings.push('Current user is not a librarian - some tests may fail');
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
  // TEST 2: Database Tables Accessibility
  // ============================================
  console.log('TEST 2: Database Tables Check');
  const tables = ['books', 'students', 'staff', 'borrow_records', 'user_profiles'];
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true });
      
      if (error) {
        console.error(`❌ ${table}: ${error.message}`);
        results.failed.push(`Table ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: ${count ?? 0} records`);
        results.passed.push(`Table ${table}: accessible (${count ?? 0} rows)`);
      }
    } catch (error) {
      console.error(`❌ ${table}: ${error.message}`);
      results.failed.push(`Table ${table}: ${error.message}`);
    }
  }
  console.log('\n');

  // ============================================
  // TEST 3: Dashboard Stats Query
  // ============================================
  console.log('TEST 3: Dashboard Stats');
  try {
    const [booksResult, studentsResult, staffResult, borrowedResult, overdueResult] = await Promise.all([
      supabase.from('books').select('id', { count: 'exact', head: true }),
      supabase.from('students').select('id', { count: 'exact', head: true }),
      supabase.from('staff').select('id', { count: 'exact', head: true }),
      supabase.from('books').select('id', { count: 'exact', head: true }).eq('status', 'borrowed'),
      supabase.from('borrow_records').select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .lt('due_date', new Date().toISOString()),
    ]);

    console.log('Dashboard Stats Results:');
    console.log('  Total Books:', booksResult.count ?? 0, booksResult.error ? `❌ ${booksResult.error.message}` : '✅');
    console.log('  Total Students:', studentsResult.count ?? 0, studentsResult.error ? `❌ ${studentsResult.error.message}` : '✅');
    console.log('  Total Staff:', staffResult.count ?? 0, staffResult.error ? `❌ ${staffResult.error.message}` : '✅');
    console.log('  Borrowed Books:', borrowedResult.count ?? 0, borrowedResult.error ? `❌ ${borrowedResult.error.message}` : '✅');
    console.log('  Overdue Books:', overdueResult.count ?? 0, overdueResult.error ? `❌ ${overdueResult.error.message}` : '✅');

    if (booksResult.error) results.failed.push(`Dashboard - Books: ${booksResult.error.message}`);
    else results.passed.push(`Dashboard - Books count: ${booksResult.count}`);

    if (studentsResult.error) results.failed.push(`Dashboard - Students: ${studentsResult.error.message}`);
    else results.passed.push(`Dashboard - Students count: ${studentsResult.count}`);

    if (staffResult.error) results.failed.push(`Dashboard - Staff: ${staffResult.error.message}`);
    else results.passed.push(`Dashboard - Staff count: ${staffResult.count}`);

    if (borrowedResult.error) results.failed.push(`Dashboard - Borrowed: ${borrowedResult.error.message}`);
    else results.passed.push(`Dashboard - Borrowed count: ${borrowedResult.count}`);

    if (overdueResult.error) results.failed.push(`Dashboard - Overdue: ${overdueResult.error.message}`);
    else results.passed.push(`Dashboard - Overdue count: ${overdueResult.count}`);

  } catch (error) {
    console.error('❌ Dashboard stats failed:', error);
    results.failed.push(`Dashboard stats: ${error.message}`);
  }
  console.log('\n');

  // ============================================
  // TEST 4: Book Management
  // ============================================
  console.log('TEST 4: Book Management');
  try {
    // Test read
    const { data: books, error: readError } = await supabase
      .from('books')
      .select('*')
      .limit(5);
    
    if (readError) {
      console.error('❌ Read books failed:', readError.message);
      results.failed.push(`Book read: ${readError.message}`);
    } else {
      console.log(`✅ Read books: ${books.length} books fetched`);
      results.passed.push(`Book read: ${books.length} books`);
    }

    // Test insert (and cleanup)
    const testBook = {
      title: 'E2E Test Book - DELETE ME',
      author_publisher: 'Test Publisher',
      isbn: `TEST-${Date.now()}`,
      category: 'Test',
      status: 'available'
    };

    const { data: newBook, error: insertError } = await supabase
      .from('books')
      .insert(testBook)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert book failed:', insertError.message);
      results.failed.push(`Book insert: ${insertError.message}`);
    } else {
      console.log('✅ Insert book succeeded:', newBook.id);
      results.passed.push('Book insert: successful');

      // Test update
      const { error: updateError } = await supabase
        .from('books')
        .update({ category: 'Test Updated' })
        .eq('id', newBook.id);

      if (updateError) {
        console.error('❌ Update book failed:', updateError.message);
        results.failed.push(`Book update: ${updateError.message}`);
      } else {
        console.log('✅ Update book succeeded');
        results.passed.push('Book update: successful');
      }

      // Test delete (cleanup)
      const { error: deleteError } = await supabase
        .from('books')
        .delete()
        .eq('id', newBook.id);

      if (deleteError) {
        console.error('❌ Delete book failed:', deleteError.message);
        results.failed.push(`Book delete: ${deleteError.message}`);
      } else {
        console.log('✅ Delete book succeeded');
        results.passed.push('Book delete: successful');
      }
    }
  } catch (error) {
    console.error('❌ Book management test failed:', error);
    results.failed.push(`Book management: ${error.message}`);
  }
  console.log('\n');

  // ============================================
  // TEST 5: Student Management
  // ============================================
  console.log('TEST 5: Student Management');
  try {
    // Test read
    const { data: students, error: readError } = await supabase
      .from('students')
      .select('*')
      .limit(5);
    
    if (readError) {
      console.error('❌ Read students failed:', readError.message);
      results.failed.push(`Student read: ${readError.message}`);
    } else {
      console.log(`✅ Read students: ${students.length} students fetched`);
      results.passed.push(`Student read: ${students.length} students`);
    }
  } catch (error) {
    console.error('❌ Student management test failed:', error);
    results.failed.push(`Student management: ${error.message}`);
  }
  console.log('\n');

  // ============================================
  // TEST 6: Staff Management
  // ============================================
  console.log('TEST 6: Staff Management');
  try {
    // Test read
    const { data: staff, error: readError } = await supabase
      .from('staff')
      .select('*')
      .limit(5);
    
    if (readError) {
      console.error('❌ Read staff failed:', readError.message);
      results.failed.push(`Staff read: ${readError.message}`);
    } else {
      console.log(`✅ Read staff: ${staff.length} staff members fetched`);
      results.passed.push(`Staff read: ${staff.length} staff members`);
      
      // Show sample staff data
      if (staff.length > 0) {
        console.log('Sample staff:', staff[0]);
      }
    }
  } catch (error) {
    console.error('❌ Staff management test failed:', error);
    results.failed.push(`Staff management: ${error.message}`);
  }
  console.log('\n');

  // ============================================
  // TEST 7: Edge Function - Create User Account
  // ============================================
  console.log('TEST 7: Edge Function - Create User Account');
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Test creating a student (dry run - will fail validation but tests the endpoint)
    const testPayload = {
      email: null,
      password: 'TestPass123',
      full_name: 'E2E Test Student',
      role: 'student',
      enrollment_id: `TEST${Date.now()}`,
      grade_level: 'Grade 10',
      phone_number: null,
      parent_email: null
    };

    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/create-user-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || 'none'}`,
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Edge function is accessible and responded');
      results.passed.push('Edge function: accessible');
      // Note: This should actually fail validation (no email/phone)
      results.warnings.push('Edge function accepted request with no contact info - validation may be loose');
    } else {
      if (result.code === 'validation_failed' && result.message === 'missing email or phone') {
        console.log('✅ Edge function validation working correctly');
        results.passed.push('Edge function: validation working');
      } else {
        console.error('❌ Edge function error:', result);
        results.failed.push(`Edge function: ${result.error || JSON.stringify(result)}`);
      }
    }
  } catch (error) {
    console.error('❌ Edge function test failed:', error);
    results.failed.push(`Edge function: ${error.message}`);
  }
  console.log('\n');

  // ============================================
  // TEST 8: Borrow Records
  // ============================================
  console.log('TEST 8: Borrow Records');
  try {
    // Test read
    const { data: records, error: readError } = await supabase
      .from('borrow_records')
      .select('*')
      .limit(5);
    
    if (readError) {
      console.error('❌ Read borrow_records failed:', readError.message);
      results.failed.push(`Borrow records read: ${readError.message}`);
    } else {
      console.log(`✅ Read borrow_records: ${records.length} records fetched`);
      results.passed.push(`Borrow records read: ${records.length} records`);
    }
  } catch (error) {
    console.error('❌ Borrow records test failed:', error);
    results.failed.push(`Borrow records: ${error.message}`);
  }
  console.log('\n');

  // ============================================
  // FINAL SUMMARY
  // ============================================
  console.log('\n========================================');
  console.log('📊 TEST SUMMARY');
  console.log('========================================\n');

  console.log(`✅ PASSED: ${results.passed.length} tests`);
  results.passed.forEach(test => console.log(`   ✅ ${test}`));

  console.log(`\n❌ FAILED: ${results.failed.length} tests`);
  results.failed.forEach(test => console.log(`   ❌ ${test}`));

  console.log(`\n⚠️  WARNINGS: ${results.warnings.length}`);
  results.warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));

  console.log('\n========================================');
  console.log(`Overall: ${results.failed.length === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log('========================================\n');

  return results;
})();
