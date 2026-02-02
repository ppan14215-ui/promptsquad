# 🔍 Debugging Guide: Grok & Claude Issues

## Issue 1: Grok Hanging ("Processing your request...")

### ✅ **FIXED** - What was wrong:
- You're running in **development mode** (`__DEV__ = true`)
- The app routes to `chat-dev` Edge Function instead of `chat`
- The `chat-dev` function had **old logic** that didn't handle Grok's native tools correctly
- When Grok returned tool calls, it showed "Processing..." and never completed

### ✅ **Solution Applied:**
- Synced `chat-dev` with the production `chat` function
- Deployed the updated `chat-dev` function
- Grok now uses native `x_search` and `web_search` tools correctly

### 🧪 **How to Test:**
1. **Refresh your app** (hard refresh: Cmd+Shift+R on web)
2. Select **Grok** from the dropdown
3. Enable **Web Search** (blue globe icon)
4. Ask: "What are people saying about Tesla on X right now?"
5. You should see:
   - "𝕏 Checking latest sentiment on X (Twitter)..."
   - Then the actual response with X data

---

## Issue 2: Claude Selection Not Working

### 🔍 **Current Status: INVESTIGATING**

The code **looks correct**, but let's verify the flow:

### **Expected Flow:**
1. User selects "Claude 3.5" from dropdown
2. `chatLLM` state updates to `'claude'`
3. `providerOverride` is set to `'claude'`
4. Edge Function receives `provider: 'claude'`
5. Backend uses Claude API

### **Potential Issues:**

#### **A. Subscription Lock (Most Likely)**
```typescript
// Line 951 in chat/[mascotId].tsx
if ((chatLLM === 'perplexity' || chatLLM === 'grok' || chatLLM === 'claude') && !isSubscribed && !isAdmin && !__DEV__) {
  console.log('[Chat] User requested Premium Model but is not Pro/Admin - falling back to undefined (Auto)');
  providerOverride = undefined;
}
```

**Check:**
- Are you subscribed? (`isSubscribed`)
- Are you an admin? (`isAdmin`)
- Is `__DEV__` true?

If **all three are false**, Claude selection is **blocked** and falls back to Auto (Gemini).

#### **B. Web Search Override**
```typescript
// Line 210 in supabase/functions/chat/index.ts
if (webSearchRequested) return 'gemini';
```

If Web Search is **ON** and you're in **Auto mode**, it forces Gemini.

**But** if you manually select Claude, this shouldn't apply.

#### **C. Provider Support Check**
```typescript
// Line 244 in supabase/functions/chat/index.ts
if (webSearch && !supportsWebSearch) {
  console.log('[Edge Function] Web search enabled but provider/config missing: Switching provider from', useProvider, 'to gemini');
  useProvider = 'gemini';
}
```

Claude **does** support web search (via Tavily), so this shouldn't trigger.

---

## 🧪 **Debugging Steps for Claude:**

### **Step 1: Check Browser Console**
Open DevTools (F12) and look for these logs when you send a message:

```
[Chat] Current chatLLM setting: claude
[Chat] Sending message with provider override: claude
```

**If you see:**
```
[Chat] User requested Premium Model but is not Pro/Admin - falling back to undefined (Auto)
```
→ **You're not subscribed/admin and not in dev mode**

### **Step 2: Check Edge Function Logs**
The backend should log:
```
[Edge Function] Received messages for mascot: X provider: claude webSearch: true/false
```

**If it says `provider: undefined`** → Frontend didn't send it correctly

### **Step 3: Verify Subscription Status**
Add this temporary log to your chat screen (around line 514):

```typescript
console.log('[DEBUG] Subscription Status:', {
  isSubscribed,
  isAdmin,
  isDev: __DEV__,
  chatLLM,
});
```

### **Step 4: Force Dev Mode (Temporary Test)**
If you want to test Claude **without** a subscription, ensure `__DEV__` is `true`:

**In your terminal where you run the app:**
```bash
# Check if NODE_ENV is set
echo $NODE_ENV

# If it's "production", Claude will be locked
# For local testing, it should be "development"
```

---

## 📋 **Quick Checklist:**

### **For Grok:**
- [x] Updated `chat-dev` function
- [x] Deployed to Supabase
- [ ] **YOU NEED TO:** Hard refresh the app (Cmd+Shift+R)
- [ ] **YOU NEED TO:** Test with a query about X/Twitter

### **For Claude:**
- [x] Code supports Claude selection
- [x] Backend has Claude API integration
- [ ] **YOU NEED TO:** Check browser console for logs
- [ ] **YOU NEED TO:** Verify subscription status
- [ ] **YOU NEED TO:** Confirm `__DEV__` is true OR you're subscribed

---

## 🚨 **What to Do Next:**

1. **Hard refresh your app** (Cmd+Shift+R on web, or restart Expo)
2. **Test Grok** with X search
3. **Open browser console** (F12)
4. **Select Claude** from dropdown
5. **Send a message** and watch the console logs
6. **Report back** with:
   - What you see in console
   - Whether Grok works now
   - Whether Claude is still reverting to another model

---

## 🔧 **Emergency Override (Dev Only):**

If you want to **force Claude** regardless of subscription, temporarily comment out the lock:

```typescript
// Line 951 in app/chat/[mascotId].tsx
// if ((chatLLM === 'perplexity' || chatLLM === 'grok' || chatLLM === 'claude') && !isSubscribed && !isAdmin && !__DEV__) {
//   console.log('[Chat] User requested Premium Model but is not Pro/Admin - falling back to undefined (Auto)');
//   providerOverride = undefined;
// } else {
  providerOverride = chatLLM; // Manual selection
// }
```

**⚠️ Remember to uncomment this before production!**
