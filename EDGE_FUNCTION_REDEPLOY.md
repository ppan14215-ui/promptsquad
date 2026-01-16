# Edge Function Redeployment Required

## The Problem

The chat function is returning 401 Unauthorized errors. I've added detailed logging to help debug the issue, but **the Edge Function needs to be redeployed** for the changes to take effect.

## Solution: Redeploy the Edge Function

### Option 1: Via Supabase Dashboard (Easiest)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Edge Functions** in the left sidebar
4. Find the `chat` function
5. Click on it to edit
6. Copy the ENTIRE contents of `supabase/functions/chat/index.ts` from this project
7. Paste it into the editor (replacing all existing code)
8. Click **Deploy** or **Save**

### Option 2: Via Supabase CLI (If you want to install it)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project (you'll need your project ref from the dashboard)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy chat
```

## What I Changed

### In `supabase/functions/chat/index.ts`:
- Added detailed logging to see exactly where authentication fails
- Added error code logging to help diagnose the issue
- Improved error responses to include more details

### In `src/services/ai/secure-chat.ts`:
- Added client-side logging to verify session and headers
- Added better error messages
- Added validation for access_token

## After Redeployment

Once you redeploy, try chatting with a mascot again. Check the browser console for the new log messages:

**Client-side logs (browser console):**
```
[SecureChat] Making request to: https://...
[SecureChat] Has access token: true
[SecureChat] Has apikey: true
```

**Server-side logs (Supabase Dashboard → Edge Functions → chat → Logs):**
```
[Edge Function] Received request
[Edge Function] Has Authorization header: true
[Edge Function] Has apikey header: true
[Edge Function] Verifying user authentication...
[Edge Function] User authenticated: <user-id>
```

If you see different logs, they'll help us identify the exact issue.

## Common Issues

### If you see "Missing Authorization header"
- The session isn't being retrieved properly on the client
- Try signing out and signing in again

### If you see "Auth error: invalid JWT"
- The token might be expired
- Try signing out and signing in again
- Check that your Supabase project URL matches your .env file

### If you see "No user found"
- The JWT is valid but doesn't match any user in the database
- This shouldn't happen - contact me if you see this

## Temporary Workaround

If you can't redeploy right now, you can try:
1. Sign out completely
2. Clear browser cache/storage
3. Sign in again
4. Try chatting

This will get you a fresh JWT token that might work better.
