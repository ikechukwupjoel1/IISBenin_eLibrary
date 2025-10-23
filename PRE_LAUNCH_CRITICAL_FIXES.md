# 🚨 CRITICAL PRE-LAUNCH FIXES - ACTION PLAN

**Priority:** IMMEDIATE  
**Deadline:** Complete before public launch  
**Estimated Time:** 4-6 hours total

---

## 🎯 STEP-BY-STEP FIX GUIDE

### ✅ STEP 1: Database Migrations (30 minutes)

**Location:** Supabase Dashboard → SQL Editor

**Run these in order:**

```sql
-- 1. Add Message Attachments Columns
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_name TEXT,
ADD COLUMN IF NOT EXISTS attachment_size INTEGER,
ADD COLUMN IF NOT EXISTS attachment_type TEXT;

CREATE INDEX IF NOT EXISTS idx_messages_has_attachment 
ON messages((attachment_url IS NOT EXISTS));
```

```sql
-- 2. Create Message Reactions Table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions(user_id);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions in their conversations"
ON message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE m.id = message_reactions.message_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
);

CREATE POLICY "Users can add reactions to their messages"
ON message_reactions FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE m.id = message_reactions.message_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
);

CREATE POLICY "Users can remove their own reactions"
ON message_reactions FOR DELETE
USING (user_id = auth.uid());
```

```sql
-- 3. Fix Books Table for Bulk Upload
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS publisher TEXT,
ADD COLUMN IF NOT EXISTS publication_year INTEGER,
ADD COLUMN IF NOT EXISTS pages INTEGER,
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS available_quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Update existing records
UPDATE books 
SET available_quantity = COALESCE(quantity, 1)
WHERE available_quantity IS NULL;

UPDATE books 
SET quantity = 1
WHERE quantity IS NULL;

-- Add constraint
ALTER TABLE books 
ADD CONSTRAINT check_available_quantity 
CHECK (available_quantity >= 0 AND available_quantity <= quantity);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_books_quantity ON books(quantity);
CREATE INDEX IF NOT EXISTS idx_books_available_quantity ON books(available_quantity);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_books_material_type ON books(material_type);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
```

**Verify:**
```sql
-- Check attachments columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'messages' AND column_name LIKE 'attachment%';

-- Check reactions table
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'message_reactions';

-- Check books columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'books' AND column_name IN 
('publisher', 'publication_year', 'pages', 'quantity', 'available_quantity', 'location', 'description');
```

---

### ✅ STEP 2: Create Storage Bucket (10 minutes)

**Location:** Supabase Dashboard → Storage

1. Click **"New bucket"**
2. Name: `message-attachments`
3. **Public:** NO (keep private)
4. Click **"Save"**

**Add Storage Policies:**

Go to Storage → message-attachments → Policies

```sql
-- Policy 1: Authenticated users can upload
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

-- Policy 2: Users can read attachments
CREATE POLICY "Users can read attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'message-attachments');

-- Policy 3: Users can delete their uploads  
CREATE POLICY "Users can delete their attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'message-attachments');
```

**Test Upload:**
- Go to ChatMessaging component
- Try uploading a small image
- Verify it appears in Storage dashboard

---

### ✅ STEP 3: Strengthen Password Security (20 minutes)

**File:** `src/components/Auth.tsx`

Replace password validation:

```typescript
// Add constants at top of file
const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_REQUIREMENTS = {
  minLength: 10,
  hasUppercase: true,
  hasLowercase: true,
  hasNumber: true,
  hasSpecial: true,
};

// Add validation function
const validatePassword = (password: string): { valid: boolean; message: string } => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character (!@#$%^&*)' };
  }
  return { valid: true, message: '' };
};

// Update passwordValid function
const passwordValid = () => {
  if (activeTab !== 'librarian') return true;
  const validation = validatePassword(password);
  return validation.valid;
};

// Update input minLength
<input
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-300 focus:outline-none transition-all duration-200 min-h-[44px]"
  placeholder="Enter your password"
  required
  minLength={10}  // Changed from 6
/>

// Update error display
{activeTab === 'librarian' && password && !passwordValid() && (
  <div className="mt-2 text-sm text-red-600">
    {validatePassword(password).message}
  </div>
)}
```

---

### ✅ STEP 4: Add Error Boundary (15 minutes)

**Create:** `src/components/ErrorBoundary.tsx`

```typescript
import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
    // TODO: Send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
            <div className="bg-red-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Oops! Something went wrong
            </h1>
            <p className="text-gray-600 mb-6">
              The application encountered an unexpected error. Don't worry, your data is safe.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
                <p className="text-sm font-mono text-red-600">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95"
              >
                Refresh Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all duration-300 active:scale-95"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

**Update:** `src/main.tsx`

```typescript
import ErrorBoundary from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
```

---

### ✅ STEP 5: Fix Realtime Subscription Cleanup (30 minutes)

**File:** `src/components/ChatMessaging.tsx`

Find all `useEffect` with Realtime subscriptions and ensure cleanup:

```typescript
// Example: Presence subscription
useEffect(() => {
  if (!selectedConversation || !profile) return;

  const channel = supabase.channel(`presence-${selectedConversation}`);
  
  channel
    .on('presence', { event: 'sync' }, () => {
      // ... existing code
    })
    .on('presence', { event: 'join' }, () => {
      // ... existing code
    })
    .on('presence', { event: 'leave' }, () => {
      // ... existing code
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: profile.id,
          online_at: new Date().toISOString(),
          typing: false
        });
      }
    });

  // CRITICAL: Cleanup
  return () => {
    channel.untrack();
    channel.unsubscribe();
    supabase.removeChannel(channel);
  };
}, [selectedConversation, profile]);

// Example: Messages subscription
useEffect(() => {
  if (!selectedConversation) return;

  const channel = supabase
    .channel(`messages-${selectedConversation}`)
    .on('postgres_changes', { ... }, () => {
      loadMessages();
    })
    .subscribe();

  // CRITICAL: Cleanup
  return () => {
    channel.unsubscribe();
    supabase.removeChannel(channel);
  };
}, [selectedConversation]);
```

**Apply same pattern to:**
- `src/components/BookManagement.tsx`
- `src/components/BorrowingSystem.tsx`
- Any component with `supabase.channel()`

---

### ✅ STEP 6: Add Input Validation (45 minutes)

**Create:** `src/utils/validation.ts`

```typescript
export const validateISBN = (isbn: string): boolean => {
  const cleaned = isbn.replace(/[-\s]/g, '');
  if (!/^\d{10}(\d{3})?$/.test(cleaned)) return false;
  
  if (cleaned.length === 10) {
    // ISBN-10 validation
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleaned[i]) * (10 - i);
    }
    const check = cleaned[9] === 'X' ? 10 : parseInt(cleaned[9]);
    sum += check;
    return sum % 11 === 0;
  } else {
    // ISBN-13 validation
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleaned[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const check = (10 - (sum % 10)) % 10;
    return check === parseInt(cleaned[12]);
  }
};

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
};

export const validatePhone = (phone: string): boolean => {
  // Nigerian phone format: +234XXXXXXXXXX or 0XXXXXXXXXX
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^(\+?234|0)[789]\d{9}$/.test(cleaned);
};

export const validateEnrollmentID = (id: string, type: 'student' | 'staff'): boolean => {
  // Format: STU12345678 or STA12345678
  const prefix = type === 'student' ? 'STU' : 'STA';
  const regex = new RegExp(`^${prefix}\\d{8}$`, 'i');
  return regex.test(id.toUpperCase());
};

export const validateDate = (date: string): boolean => {
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
};

export const validateFutureDate = (date: string): boolean => {
  return validateDate(date) && new Date(date) > new Date();
};
```

**Use in components:**

```typescript
import { validateISBN, validateEmail } from '../utils/validation';

// In BookManagement.tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (formData.isbn && !validateISBN(formData.isbn)) {
    toast.error('Invalid ISBN format');
    return;
  }
  
  // ... rest of submit
};

// In LibrarianSetup.tsx, Auth.tsx
if (!validateEmail(email)) {
  toast.error('Please enter a valid email address');
  return;
}
```

---

### ✅ STEP 7: Environment Variables (15 minutes)

**Create:** `.env.production`

```env
# Supabase
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# App Settings
VITE_APP_ENV=production
VITE_APP_NAME=IISBenin eLibrary
VITE_MAX_FILE_SIZE=10485760
VITE_SESSION_TIMEOUT=7200000

# Features
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_OFFLINE=false
```

**Update:** `vite.config.ts`

```typescript
export default defineConfig({
  // ... existing config
  define: {
    __APP_ENV__: JSON.stringify(process.env.VITE_APP_ENV),
  },
});
```

**Configure in Vercel:**

1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add all variables from `.env.production`
3. Set to Production environment
4. Redeploy

---

### ✅ STEP 8: Add Loading States (30 minutes)

**Pattern to apply everywhere:**

```typescript
const [loading, setLoading] = useState(false);
const [submitting, setSubmitting] = useState(false);

const handleAction = async () => {
  if (submitting) return; // Prevent double-submit
  
  setSubmitting(true);
  try {
    await performAction();
    toast.success('Success!');
  } catch (error) {
    toast.error('Failed: ' + error.message);
  } finally {
    setSubmitting(false);
  }
};

<button 
  disabled={submitting || loading}
  className="..."
>
  {submitting ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin mr-2" />
      Processing...
    </>
  ) : (
    'Submit'
  )}
</button>
```

**Apply to:**
- BookManagement: Add, Edit, Delete buttons
- BorrowingSystem: Borrow, Return buttons
- StudentManagement: CRUD operations
- ChatMessaging: Send message button

---

### ✅ STEP 9: Create Initial Librarian (10 minutes)

**Two options:**

**Option A: Via LibrarianSetup Screen**
1. Clear browser data / use incognito
2. Visit app
3. Should show LibrarianSetup screen
4. Fill form with strong password (10+ chars)
5. Create account

**Option B: Via Supabase Dashboard**

```sql
-- Create auth user first in Supabase Auth dashboard
-- Then run:
INSERT INTO user_profiles (id, email, full_name, role)
VALUES (
  'AUTH_USER_UUID_HERE',
  'admin@iisbenin.edu.ng',
  'IIS Benin Library Administrator',
  'librarian'
);
```

**Test login:**
- Email: admin@iisbenin.edu.ng
- Password: (your strong password)

---

### ✅ STEP 10: Final Testing (60 minutes)

**Test Checklist:**

```
Authentication:
[ ] Librarian login with email
[ ] Staff login with enrollment ID
[ ] Student login with enrollment ID
[ ] Logout
[ ] Password strength validation
[ ] Session persistence

Dashboard:
[ ] Stats display correctly
[ ] Reading leaderboard shows
[ ] Role-based visibility works

Books:
[ ] Add new book
[ ] Edit book
[ ] Delete book
[ ] Search books
[ ] Filter by type
[ ] ISBN validation

Borrowing:
[ ] Borrow book (decreases available_quantity)
[ ] Return book (increases available_quantity)
[ ] Overdue detection
[ ] Date validation

Messaging:
[ ] Send text message
[ ] Upload image attachment
[ ] Upload PDF attachment
[ ] Add emoji reaction
[ ] Remove reaction
[ ] Translate message
[ ] Online indicator shows
[ ] Typing indicator shows

Digital Library:
[ ] View ebooks
[ ] Download PDF
[ ] Filter by type

Error Handling:
[ ] Trigger error (enter bad data)
[ ] Error boundary catches it
[ ] Can recover without refresh

Performance:
[ ] Page loads < 3 seconds
[ ] Animations smooth
[ ] No console errors
[ ] Mobile responsive
```

---

## 🎯 SUCCESS CRITERIA

After completing all steps, verify:

✅ No critical console errors  
✅ All 8 database migrations applied  
✅ Storage bucket created and working  
✅ File upload works  
✅ Emoji reactions work  
✅ Password requires 10+ characters  
✅ Error boundary catches crashes  
✅ All buttons show loading states  
✅ Input validation prevents bad data  
✅ Realtime subscriptions clean up  
✅ Initial librarian account exists  

---

## 🚀 DEPLOYMENT

After all fixes:

```bash
# Build and test locally
npm run build
npm run preview

# Deploy to production
vercel --prod

# Test production URL
# Verify all features work
```

---

## 📞 EMERGENCY ROLLBACK

If critical issue after deployment:

```bash
# Rollback to previous deployment
vercel rollback

# Or revert git commit
git revert HEAD
git push origin main
```

---

**Estimated Total Time:** 4-6 hours  
**Can be parallelized:** Some steps can be done simultaneously  
**Recommended:** Complete in order for best results
