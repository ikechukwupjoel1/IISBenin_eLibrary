// QUICK TEST: Student login with known credentials
// Run this in browser console to test student login

(async () => {
  // Use the enrollment ID from the student record you showed
  const enrollmentId = 'STU85043294';
  // You'll need to replace this with the actual password from creation
  const password = prompt('Enter the password for student ' + enrollmentId + ':');

  if (!password) {
    console.log('Test cancelled');
    return;
  }

  console.log('Testing student login for:', enrollmentId);

  try {
    // Import the signIn function from AuthContext
    const { signIn } = window.supabaseAuth || { signIn: null };

    if (!signIn) {
      console.error('Auth context not available. Make sure you are on the login page.');
      return;
    }

    await signIn(enrollmentId, password, 'student');
    console.log('✅ Login successful!');
  } catch (error) {
    console.error('❌ Login failed:', error.message);
  }
})();