/**
 * Get Complete Schema from Database
 * Uses PostgreSQL information_schema
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://myxwxakwlfjoovvlkkul.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eHd4YWt3bGZqb292dmxra3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMzUzNzcsImV4cCI6MjA3NTcxMTM3N30.UJSR_IVnabXNY-ITNkU-2RxETKsLjEBYKAWxD7fKDpw';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Getting Complete Database Schema\n');

async function getCompleteSchema() {
  const tables = [
    'books',
    'students', 
    'staff',
    'borrow_records',
    'reading_progress',
    'book_reports',
    'user_badges',
    'reading_streaks',
    'notifications'
  ];

  const schemaInfo = {};

  for (const table of tables) {
    console.log(`\n📋 Checking: ${table}`);
    
    // Query information_schema to get columns
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = '${table}'
        ORDER BY ordinal_position;
      `
    });

    if (error) {
      // Try alternative method - direct query
      const { data: testData } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (testData) {
        if (testData.length > 0) {
          const columns = Object.keys(testData[0]);
          console.log(`   ✅ Found ${columns.length} columns:`);
          columns.forEach(col => console.log(`      • ${col}`));
          schemaInfo[table] = columns;
        } else {
          console.log(`   ⚠️  Table exists but is empty`);
          console.log(`      (Cannot determine columns without data)`);
          schemaInfo[table] = 'empty';
        }
      }
    }
  }

  // Now let's manually check what we know
  console.log('\n' + '═'.repeat(60));
  console.log('📊 KNOWN SCHEMA FROM TESTS:');
  console.log('═'.repeat(60));

  console.log('\n✅ students table HAS:');
  console.log('   • id, name, email, phone_number, grade_level');
  console.log('   • enrollment_id, created_at, user_profile_id, parent_email');
  console.log('   ❌ MISSING: admission_number');

  console.log('\n✅ staff table HAS:');
  console.log('   • id, name, email, enrollment_id, phone_number, created_at');

  console.log('\n✅ reading_progress table HAS:');
  console.log('   • id, user_id, books_read, current_streak, longest_streak');
  console.log('   • reading_level, total_pages_read, achievements, weekly_goal');
  console.log('   • last_read_date, created_at, updated_at');
  console.log('   ❌ MISSING: book_id (this is not a per-book progress table!)');

  console.log('\n❌ reading_streaks table:');
  console.log('   • DOES NOT EXIST (data is in reading_progress)');

  console.log('\n⚠️  Need to check in Supabase:');
  console.log('   • books: columns?');
  console.log('   • borrow_records: columns?');
  console.log('   • book_reports: columns? (no book_id found)');
  console.log('   • user_badges: columns?');
  console.log('   • notifications: columns?');

  console.log('\n' + '═'.repeat(60));
  console.log('💡 ACTION REQUIRED:');
  console.log('═'.repeat(60));
  console.log('\n1. Go to Supabase Dashboard → Table Editor');
  console.log('2. Click on each table to see columns');
  console.log('3. Share the column names here, OR');
  console.log('4. I\'ll create a safer migration that skips errors\n');
}

getCompleteSchema().catch(console.error);
