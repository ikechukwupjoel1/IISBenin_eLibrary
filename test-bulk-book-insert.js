// Test bulk book upload after schema fix
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

async function testBulkBookInsert() {
  console.log('🧪 Testing bulk book insert with available_quantity...\n');

  const testBook = {
    title: 'Test Book for Bulk Upload',
    author: 'Test Author',
    isbn: '9781234567890',
    category: 'Test Category',
    material_type: 'book',
    publisher: 'Test Publisher',
    publication_year: 2024,
    pages: 250,
    quantity: 5,
    available_quantity: 5,
    location: 'Test Shelf',
    description: 'This is a test book for bulk upload',
    status: 'available',
  };

  console.log('📝 Attempting to insert test book:');
  console.log(JSON.stringify(testBook, null, 2));

  const { data, error } = await supabase
    .from('books')
    .insert([testBook])
    .select();

  if (error) {
    console.error('\n❌ ERROR inserting book:');
    console.error('Message:', error.message);
    console.error('Details:', error.details);
    console.error('Code:', error.code);
    console.error('Full error:', JSON.stringify(error, null, 2));
  } else {
    console.log('\n✅ Book inserted successfully!');
    console.log('Data:', data);

    // Clean up test book
    if (data && data[0]) {
      await supabase.from('books').delete().eq('id', data[0].id);
      console.log('\n🗑️ Test book cleaned up');
    }
  }

  // Check books table schema
  console.log('\n📊 Checking books table for available_quantity column...');
  const { data: books, error: queryError } = await supabase
    .from('books')
    .select('title, quantity, available_quantity, status')
    .limit(3);

  if (queryError) {
    console.error('❌ Error querying books:', queryError);
  } else {
    console.log('✅ Sample books with available_quantity:');
    console.table(books);
  }
}

testBulkBookInsert().catch(console.error);
