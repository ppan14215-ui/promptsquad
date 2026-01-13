# Supabase Setup Guide for Prompt Squad

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Name it "prompt-squad" and set a database password
4. Wait for the project to be created

## 2. Get Your Project Credentials

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxx.supabase.co`)
   - **anon public** key (safe for client-side)
   - **service_role** key (keep secret, for Edge Functions only)

## 3. Set Up Environment Variables

Create a `.env` file in your project root:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# AI Keys (for local development only - move to Supabase secrets for production)
EXPO_PUBLIC_OPENAI_API_KEY=your-openai-key
EXPO_PUBLIC_GEMINI_API_KEY=your-gemini-key
```

## 4. Run the Database Migration

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `supabase/migrations/001_initial_schema.sql`
3. Paste and run the SQL

This creates:
- `mascots` - Public mascot information
- `mascot_prompts` - Hidden system prompts (server-side only)
- `profiles` - User profiles
- `user_mascots` - User's unlocked mascots
- `conversations` - Chat sessions
- `messages` - Chat messages

## 5. Set Up Edge Function Secrets

In Supabase Dashboard → **Settings** → **Edge Functions** → **Secrets**, add:

```
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key
```

## 6. Deploy the Edge Function

### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy chat
```

### Option B: Manual Deployment

1. Go to **Edge Functions** in Supabase Dashboard
2. Click "New Function"
3. Name it `chat`
4. Copy the contents of `supabase/functions/chat/index.ts`
5. Deploy

## 7. Enable Authentication

### Email/Password Auth
1. Go to **Authentication** → **Providers**
2. Email is enabled by default

### Google OAuth (Optional)
1. Go to **Authentication** → **Providers** → **Google**
2. Enable and add your Google OAuth credentials

### Apple Sign In (Optional)
1. Go to **Authentication** → **Providers** → **Apple**
2. Enable and configure with your Apple Developer credentials

## 8. Test the Setup

1. Restart your dev server: `npm start -- --clear`
2. Sign up a test user
3. Try chatting with a mascot
4. Check Supabase logs for any errors

## Security Features

### Row Level Security (RLS)
- **mascots**: Public read access
- **mascot_prompts**: NO public access (server-side only via service role)
- **profiles**: Users can only access their own profile
- **user_mascots**: Users can only see their own unlocked mascots
- **conversations**: Users can only access their own chats
- **messages**: Users can only access messages in their conversations

### Edge Function Security
- Validates JWT authentication
- Checks mascot access (free or unlocked)
- System prompts never sent to client
- API keys stored as secrets, not in code

## Database Schema Overview

```
┌─────────────────┐     ┌─────────────────┐
│    mascots      │────▶│ mascot_prompts  │
│  (public info)  │     │ (hidden prompts)│
└────────┬────────┘     └─────────────────┘
         │
         │
┌────────▼────────┐     ┌─────────────────┐
│  user_mascots   │◀────│    profiles     │
│ (unlocked list) │     │  (user prefs)   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  conversations  │────▶│    messages     │
│  (chat sessions)│     │ (chat history)  │
└─────────────────┘     └─────────────────┘
```

## Switching to Secure Mode

To use the secure Edge Function instead of client-side AI calls, update your chat screen:

```typescript
// Before (insecure - API keys in client)
import { streamChat } from '@/services/ai';

// After (secure - API keys on server)
import { secureChatStream } from '@/services/ai';

// Usage
const response = await secureChatStream(
  mascotId,
  messages,
  (chunk) => setStreamingContent((prev) => prev + chunk)
);
```

## Troubleshooting

### "Unauthorized" error
- Make sure user is signed in
- Check that the JWT is being passed correctly

### "Mascot not unlocked" error
- User needs to purchase the mascot or have a subscription
- Or make the mascot `is_free = true` in the database

### Edge Function not responding
- Check Supabase Edge Function logs
- Verify secrets are set correctly
- Make sure the function is deployed

