# 🚀 DEPLOY EDGE FUNCTIONS - STEP BY STEP

## Your Project Information
- **Supabase URL**: https://myxwxakwlfjoovvlkkul.supabase.co
- **Project Ref**: myxwxakwlfjoovvlkkul

---

## ⚡ DEPLOY NOW (3 Minutes)

### 1️⃣ Open Supabase Dashboard
Click this link: **https://app.supabase.com/project/myxwxakwlfjoovvlkkul/functions**

### 2️⃣ Deploy First Function: change-password

1. Click **"Create a new function"** button
2. Function name: `change-password`
3. Open this file in VS Code: `supabase/functions/change-password/index.ts`
4. **Copy ALL the code** (Ctrl+A, Ctrl+C)
5. **Paste** into the Supabase editor
6. Click **"Deploy function"**
7. Wait for ✅ success message

### 3️⃣ Deploy Second Function: verify-login

1. Click **"Create a new function"** button again
2. Function name: `verify-login`
3. Open this file in VS Code: `supabase/functions/verify-login/index.ts`
4. **Copy ALL the code** (Ctrl+A, Ctrl+C)
5. **Paste** into the Supabase editor
6. Click **"Deploy function"**
7. Wait for ✅ success message

---

## ✅ Test After Deployment

1. Go to: https://iisbeninelibrary-oihl2gavn-joel-prince-a-ikechukwus-projects.vercel.app
2. Login as **staff or student**
3. Click **"Change Password"** tab
4. Change your password
5. Should see: **"Password changed successfully!"**
6. Sign out and login with new password

---

## 🎯 What You Get After Deployment

✅ **Secure bcrypt hashing** for all new passwords
✅ **No more "Network error"** messages  
✅ **Professional-grade security**
✅ **Passwords protected** even if database is compromised

---

## 📱 Quick Links

- **Supabase Functions Dashboard**: https://app.supabase.com/project/myxwxakwlfjoovvlkkul/functions
- **Your App**: https://iisbeninelibrary-oihl2gavn-joel-prince-a-ikechukwus-projects.vercel.app
- **Function 1 Code**: `supabase/functions/change-password/index.ts`
- **Function 2 Code**: `supabase/functions/verify-login/index.ts`

---

## ❓ Troubleshooting

**If you see errors:**
- Make sure you copied the ENTIRE file content (all 121 lines for change-password, 140 lines for verify-login)
- Check that function names are exactly: `change-password` and `verify-login` (with dashes, not spaces)
- Wait a few seconds after deployment before testing

**Still having issues?**
- Check function logs in Supabase Dashboard
- The app will still work in fallback mode (but without bcrypt hashing)

---

## 🎉 That's It!

Once deployed, your password system will be **production-ready** and **secure**!
