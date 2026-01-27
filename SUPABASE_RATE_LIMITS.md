# Supabase Email Rate Limits - Solutions

## The Problem
Supabase has email rate limits to prevent abuse. During development, you might hit these limits:
- **4 emails per hour** per email address (default for free tier)
- **Per IP address limits** for sending requests

## Quick Solutions

### 1. Wait It Out (Simplest)
- Wait **5-10 minutes** between OTP requests
- The rate limit typically resets after a short period
- Plan your testing to minimize email requests

### 2. Use Multiple Test Email Addresses
Instead of using one email repeatedly, rotate between several test emails:

```bash
# Gmail trick - all these go to the same inbox:
yourname+test1@gmail.com
yourname+test2@gmail.com
yourname+test3@gmail.com
# etc.
```

### 3. Enable Phone Authentication (Alternative)
Add SMS/Phone OTP as an alternative (requires Twilio setup):
- Go to Supabase Dashboard → Authentication → Providers
- Enable "Phone" provider
- Configure Twilio credentials

### 4. Increase Rate Limits (Paid Plans)
If you're on a paid Supabase plan:
1. Go to **Project Settings** → **Authentication**
2. Contact Supabase support to increase limits
3. Or use custom SMTP (see below)

### 5. Use Custom SMTP (Recommended for Production)
Configure your own email service to bypass Supabase's limits:

#### Step 1: Set up a service (choose one):
- **SendGrid** (Free tier: 100 emails/day)
- **Mailgun** (Free tier: 1,000 emails/month)
- **AWS SES** (Very cheap, high limits)
- **Resend** (Free tier: 100 emails/day)

#### Step 2: Configure in Supabase
1. Go to **Project Settings** → **Authentication** → **SMTP Settings**
2. Enable "Custom SMTP"
3. Enter your SMTP credentials:
   ```
   Host: smtp.sendgrid.net (or your provider)
   Port: 587
   Username: apikey (or your username)
   Password: [your API key]
   Sender email: noreply@yourdomain.com
   Sender name: Nūūky
   ```

### 6. Development Mode: Use Magic Links Temporarily
If you need to test frequently during development:

**Temporarily enable magic links** for faster testing:
```typescript
// In email.tsx - ONLY FOR DEVELOPMENT
const { error } = await supabase.auth.signInWithOtp({
  email: email.trim().toLowerCase(),
  options: {
    shouldCreateUser: true,
    // Comment out this line temporarily:
    // emailRedirectTo: undefined,
  },
});
```

Magic links don't require entering a code, so you can test the flow faster.

**Remember to re-enable OTP before going to production!**

### 7. Use Supabase Local Development
For heavy testing, use local Supabase:

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize local project
supabase init

# Start local Supabase (includes email inbucket)
supabase start

# Update your .env to use local instance
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=[local anon key from supabase start]
```

The local instance includes **Inbucket** - a local email catcher at `http://localhost:54324` where you can see all OTP emails without limits!

## Best Practices for Production

1. **Use Custom SMTP** - Don't rely on Supabase's email service
2. **Add Rate Limiting UI** - Show users when they need to wait
3. **Implement Retry Logic** - Handle rate limit errors gracefully
4. **Add Alternative Auth** - Offer phone, Google, or Apple sign-in
5. **Monitor Usage** - Track authentication attempts

## Updated Error Handling

I've updated your code to show a better message when rate limits are hit:

```typescript
// Now shows:
"Too many login attempts. Please wait 5-10 minutes before trying again."
```

## Testing Strategy

To avoid rate limits during development:

1. **Use 3-4 test emails** (Gmail + trick works great)
2. **Test UI/UX changes** with mock data or local Supabase
3. **Full auth flow testing** - do it sparingly
4. **Before major testing** - wait for rate limit reset
5. **Consider local Supabase** for heavy development days

## Current Status

✅ Better error messages for rate limits
✅ User-friendly feedback in the app

🔄 Recommended next steps:
- Set up custom SMTP for production
- Use local Supabase for development
- Use multiple test emails for now

---

**Immediate Solution:** Wait 5-10 minutes and use a different email address (like `yourname+test2@gmail.com`)
