# Email Setup Guide — Reduce Spam & Improve Deliverability

Supabase Auth emails (confirmation, password reset, magic link) often land in spam. This guide explains why and how to fix it.

---

## Why Emails Land in Spam

1. **Default Supabase SMTP**
   - Limited to ~2 messages/hour
   - Sends from `noreply@mail.app.supabase.io` — shared, low-trust domain
   - Often not fully aligned with DKIM/SPF for your app

2. **Generic or Suspicious Content**
   - Minimal HTML, vague subjects, no clear sender/brand
   - Link-only emails with no context
   - No plain-text alternative

3. **Domain Reputation**
   - New domains or shared sending domains have low trust
   - Missing or weak DKIM, SPF, DMARC

---

## Fixes (in order of impact)

### 1. Use Custom SMTP (Required for Production)

Use a dedicated email provider instead of Supabase’s default SMTP:

| Provider | Notes |
|----------|-------|
| **Resend** | Simple API, good docs, free tier |
| **Brevo** | Solid for transactional, free tier |
| **SendGrid** | Widely used, free tier |
| **Postmark** | Strong for transactional deliverability |
| **AWS SES** | Cheap at scale, needs more setup |

**Where to configure:** Supabase Dashboard → **Project Settings** → **Authentication** → **SMTP Settings**

**Resend (example):**

1. Sign up at [resend.com](https://resend.com)
2. Add and verify your domain (`promptsquad.app`)
3. Create an API key
4. In Supabase SMTP settings:

   - **Host:** `smtp.resend.com`
   - **Port:** `465` (SSL) or `587` (TLS)
   - **Username:** `resend`
   - **Password:** your Resend API key
   - **Sender email:** `auth@promptsquad.app` (or `noreply@promptsquad.app`)
   - **Sender name:** `Prompt Squad`

---

### 2. Configure DKIM, SPF & DMARC

These are required for good deliverability. Your SMTP provider will guide you:

- **DKIM:** Cryptographic signature proving the email comes from your domain  
- **SPF:** DNS record listing allowed mail servers  
- **DMARC:** Policy for how receivers handle failed DKIM/SPF checks  

**Example DNS (adjust per provider):**

```txt
# SPF - allow your provider
v=spf1 include:_spf.resend.com ~all

# DMARC - report and reject failures
v=DMARC1; p=quarantine; rua=mailto:dmarc@promptsquad.app
```

**Sender alignment:**

- Use a subdomain for auth emails, e.g. `auth@promptsquad.app`
- Make sure `From` address matches the verified domain

---

### 3. Customize Email Templates

Supabase Dashboard → **Authentication** → **Email Templates**

Use the templates in `supabase/templates/` as a starting point. They are:

- Minimal, clean HTML
- Branded with Prompt Squad
- Clear subject lines and CTAs
- Written to avoid spam triggers

**Template variables:**

| Variable | Description |
|----------|-------------|
| `{{ .ConfirmationURL }}` | Full confirmation URL |
| `{{ .Token }}` | 6-digit OTP |
| `{{ .TokenHash }}` | Hashed token (for custom URLs) |
| `{{ .Email }}` | User email |
| `{{ .SiteURL }}` | Your app URL |
| `{{ .RedirectTo }}` | Redirect after action |

---

### 4. Best Practices

- **Disable link/open tracking** — Can corrupt verification links and hurt trust
- **Use a clear subject** — e.g. `Confirm your Prompt Squad signup`
- **Avoid spammy words** — "free", "act now", "urgent", etc.
- **Keep HTML simple** — No heavy images or complex layout
- **Match content to subject** — Body should clearly match the subject

---

## Applying the Templates

### Option A: Supabase Dashboard (Production)

1. Go to **Supabase Dashboard** → **Authentication** → **Email Templates**
2. For each template in the left sidebar, do the following:
   - Open the matching HTML file from `supabase/templates/` in your editor
   - Copy the **entire** file contents (Cmd+A, Cmd+C)
   - Paste into the Supabase template's HTML editor (replace any existing content)
   - Set the **Subject** as shown below
   - Click **Save**

| Supabase template | Subject | HTML file |
|-------------------|---------|-----------|
| Confirm signup | `Confirm your Prompt Squad account` | `confirmation.html` |
| Reset password | `Reset your Prompt Squad password` | `recovery.html` |
| Magic link | `Sign in to Prompt Squad` | `magic_link.html` |
| Invite user | `You're invited to Prompt Squad` | `invite.html` |
| Change email address | `Confirm your new email address` | `email_change.html` |
| Reauthentication | `Verify your identity` | `reauthentication.html` |

3. **Test:** Trigger a signup or password reset to see the new design in your inbox.

### Option B: Local Development (config.toml)

If you run Supabase locally:

```toml
[auth.email.template.confirmation]
subject = "Confirm your Prompt Squad account"
content_path = "./supabase/templates/confirmation.html"

[auth.email.template.recovery]
subject = "Reset your Prompt Squad password"
content_path = "./supabase/templates/recovery.html"

[auth.email.template.magic_link]
subject = "Sign in to Prompt Squad"
content_path = "./supabase/templates/magic_link.html"
```

---

## Quick Checklist

- [ ] Custom SMTP configured (Resend, Brevo, etc.)
- [ ] Domain verified with provider
- [ ] DKIM, SPF, DMARC DNS records set
- [ ] Sender address like `auth@promptsquad.app` or `noreply@promptsquad.app`
- [ ] Custom templates applied in Dashboard
- [ ] Link/open tracking disabled (if provider supports it)
- [ ] Site URL and Redirect URLs set in Supabase Auth settings
