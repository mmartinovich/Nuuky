# Email OTP Setup Guide

## Problem
You're receiving magic link confirmation emails instead of 6-digit OTP codes.

## Solution

### 1. Update Supabase Email Template (REQUIRED)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your **Nuuky** project
3. Navigate to **Authentication** → **Email Templates**
4. Find the **Magic Link** or **Confirm signup** template
5. Replace the content with this OTP-focused template:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center;">
    <h1 style="color: white; margin: 0;">Nūūky</h1>
  </div>
  
  <div style="background: #f7f7f7; padding: 30px; border-radius: 10px; margin-top: 20px;">
    <h2 style="color: #333; margin-top: 0;">Your verification code</h2>
    <p style="font-size: 16px; color: #666;">Enter this code in the app to verify your email:</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
      <h1 style="font-size: 48px; font-weight: bold; letter-spacing: 8px; margin: 0; color: #667eea;">{{ .Token }}</h1>
    </div>
    
    <p style="font-size: 14px; color: #999; text-align: center;">This code expires in 60 minutes</p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="font-size: 14px; color: #666;">
      If you didn't request this code, you can safely ignore this email.
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
    <p>This is an automated message from Nūūky. Please do not reply to this email.</p>
  </div>
</body>
</html>
```

6. **Important:** Make sure to replace ALL email templates that might be used:
   - Magic Link
   - Confirm signup
   - Email Change

### 2. Code Changes (COMPLETED ✅)

I've already updated your code to explicitly disable magic links:

- ✅ Updated `email.tsx` - both send and resend functions
- ✅ Updated `useAuth.ts` hook

The changes add `emailRedirectTo: undefined` to force OTP mode.

### 3. Test the Changes

1. **Clear any cached sessions:**
   ```bash
   # If testing in Expo Go
   npx expo start --clear
   ```

2. **Try logging in again:**
   - Enter your email
   - You should now receive a 6-digit code instead of a link

3. **Check your email:**
   - Look for an email with a large 6-digit code
   - The format should be: `123456` (not a clickable link)

### 4. Troubleshooting

#### Still receiving magic links?
- Verify you saved the email template in Supabase dashboard
- Check that you're editing the correct template (Magic Link or Confirm signup)
- Wait a few minutes for the changes to propagate

#### Not receiving any emails?
- Check your spam/junk folder
- Verify the email address is correct
- Check Supabase logs: **Authentication** → **Logs**

#### Getting an error when verifying?
- Make sure you're entering the full 6-digit code
- The code expires after 60 minutes
- Try requesting a new code with "Resend"

### 5. Alternative: Use Email Variable

If the `{{ .Token }}` variable doesn't work, try:
- `{{ .TokenHash }}` - Full OTP code
- `{{ .ConfirmationURL }}` - Magic link (but we want to avoid this)

The correct variable for OTP codes is `{{ .Token }}`.

### 6. Additional Configuration

In your Supabase dashboard, verify these settings:

1. **Authentication** → **Settings** → **Auth Providers**
   - Ensure "Email" is enabled
   - Set "Confirm email" to ON (for new signups)

2. **Authentication** → **Settings** → **Email**
   - Set "Email OTP Expiry" to `3600` (1 hour)
   - Verify SMTP settings if using custom email

## Expected Behavior After Fix

1. User enters email → clicks "Send Code"
2. User receives email with **6-digit code** (e.g., `123456`)
3. User enters the code in the app
4. User is authenticated and proceeds to onboarding/main screen

---

**Note:** After making these changes, test with a fresh email to ensure the new template is being used.
