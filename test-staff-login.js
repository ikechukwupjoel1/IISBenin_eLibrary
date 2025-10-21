// TEST: Can staff login with the new authentication system?
// Open browser console (F12) and paste this code

(async () => {
  console.log('Testing staff login...');

  // Test login with enrollment ID and password
  const enrollmentId = 'STAFF123'; // Use the enrollment ID from your test staff creation
  const password = 'StaffPass123'; // Use the password from your test

  try {
    const response = await fetch('http://localhost:5173/api/login', { // Adjust URL if needed
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: enrollmentId,
        password: password,
        role: 'staff'
      }),
    });

    const result = await response.json();

    console.log('Login Response Status:', response.status);
    console.log('Login Response:', result);

    if (result.error) {
      console.error('❌ Login Error:', result.error);
    } else {
      console.log('✅ Login Success!', result);
    }
  } catch (error) {
    console.error('❌ Network Error:', error);
  }
})();