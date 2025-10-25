/**
 * Check Database Schema
 * This script will show what columns exist in each table
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://myxwxakwlfjoovvlkkul.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eHd4YWt3bGZqb292dmxra3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMzUzNzcsImV4cCI6MjA3NTcxMTM3N30.UJSR_IVnabXNY-ITNkU-2RxETKsLjEBYKAWxD7fKDpw';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Checking Database Schema\n');
console.log('This will show what columns exist in each table.\n');

async function checkSchema() {
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

  for (const table of tables) {
    console.log(`\n📋 Table: ${table}`);
    console.log('─'.repeat(50));
    
    try {
      // Get one row to see columns
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
      } else if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        console.log(`   ✅ Columns (${columns.length}):`);
        columns.forEach(col => {
          const value = data[0][col];
          const type = typeof value;
          console.log(`      • ${col} (${type})`);
        });
      } else {
        console.log(`   ⚠️  Table is empty - fetching schema differently`);
        // Try selecting with head to get structure
        const { error: headError } = await supabase
          .from(table)
          .select('*')
          .limit(0);
        
        if (headError) {
          console.log(`      ❌ ${headError.message}`);
        } else {
          console.log(`      ✅ Table exists but is empty`);
        }
      }
    } catch (e) {
      console.log(`   ❌ Exception: ${e.message}`);
    }
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log('✅ Schema check complete!\n');
  console.log('💡 Now you can create indexes only for columns that exist.\n');
}

checkSchema().catch(console.error);
