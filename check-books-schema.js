// Check books table structure
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env file
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
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBooksTable() {
  console.log('🔍 Checking books table structure...\n');

  // Get sample book to see all columns
  const { data: books, error } = await supabase
    .from('books')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error querying books:', error);
    return;
  }

  if (books && books.length > 0) {
    console.log('📋 Books table columns:');
    const columns = Object.keys(books[0]);
    columns.forEach((col, index) => {
      console.log(`${index + 1}. ${col}: ${typeof books[0][col]} = ${books[0][col]}`);
    });
    
    console.log('\n📊 Full sample book:');
    console.log(JSON.stringify(books[0], null, 2));
  } else {
    console.log('⚠️ No books found in table');
  }

  // Count total books
  const { count } = await supabase
    .from('books')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📈 Total books in database: ${count}`);
}

checkBooksTable().catch(console.error);
