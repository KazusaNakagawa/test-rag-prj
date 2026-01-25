# Local Auth Alternatives (Supabase)

This note explains practical ways to avoid the magic-link email rate limit
during local development.

## Option A: Use Supabase CLI + Mailpit (no external email)

1. Install and start Supabase locally.
   ```bash
   # prerequisite
   # Docker engine must be installed and running (Docker Desktop or Rancher Desktop)

   # macOS (Homebrew)
   brew install supabase/tap/supabase

   # or npm
   npm install -g supabase

   supabase start

   # useful commands
   supabase status
   supabase stop
   ```
2. Open the local Studio and Mailpit.
   - Studio: http://localhost:54323
   - Mailpit UI: http://localhost:54324
3. Trigger a magic-link login in your app.
4. Open the email in Mailpit and use the link.

Notes:
- This keeps all traffic local and avoids hosted email limits.

## Option B: Disable email confirmations locally + use password sign-in

1. In your local Supabase config, disable email confirmations.
   - Create `supabase/config.toml` if it does not exist.
   - Example:
     ```toml
     [auth.email]
     enable_confirmations = false
     ```
2. Sign up once, then sign in with email + password.
3. Keep this change local-only (do not enable it in production).

Notes:
- This is the simplest path if you already support password sign-in.

## Option C: Configure external SMTP (free tier)

1. Create an SMTP account with a free tier provider.
2. In Supabase Dashboard -> Authentication -> SMTP, configure the SMTP settings.
3. Retry magic-link sign-in; the external provider handles sends.

Notes:
- Provider limits apply, but are often higher than Supabase free tier.

## Option D: Use OAuth or passkeys

1. Enable the provider in Supabase Dashboard -> Authentication -> Providers.
2. Add client-side logic to support the provider.
3. Test the new flow locally.

Notes:
- Requires UI and auth flow updates; not a quick switch.
