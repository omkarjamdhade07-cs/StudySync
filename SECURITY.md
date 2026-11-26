# StudySync — Security

## Threat Model

| Asset | Threat | Mitigation Implemented | Remaining Risk |
|---|---|---|---|
| User accounts | Account takeover via credential stuffing | Supabase Auth; password min 10 chars; email verification required; `signOut({ scope: 'global' })` to revoke all sessions | No TOTP/2FA (future scope) |
| All user data | IDOR / cross-user data access | Row Level Security on every table with `using (user_id = auth.uid())` and `with check (user_id = auth.uid())`; anon key only in client | Service role key exposure if Edge Function is misconfigured |
| Browser session | XSS leading to token theft | No `dangerouslySetInnerHTML`; React escapes all rendered values; CSP `script-src 'self'` blocks inline scripts | Third-party dependency XSS (mitigated by CSP) |
| Syllabus text input | Prompt injection — user pastes instructions into syllabus hoping LLM executes them | System prompt explicitly instructs LLM to treat input as data only; output validated against strict zod schema; user reviews all output before saving | LLM jailbreaks (residual; mitigated by output schema validation) |
| Supabase service role key | Key leakage into client bundle or git history | Service role key only in Edge Function environment variables; `.env` in `.gitignore`; only anon key in `VITE_*` env vars | Accidental log leak in Edge Function (mitigated by no-log policy) |
| Eval / feedback data | Over-collection of personal data | Eval events only written if user opts in (default off); no PII in eval events (no names or emails); feedback responses are voluntarily submitted | Linking eval events to identity via `user_id` (inherent; minimised by keeping only anonymous metrics) |

## RLS Verification

To verify cross-user isolation, run the following in the Supabase SQL editor while authenticated as User A:

```sql
-- Replace <user_b_id> with any other user's UUID
select count(*) from public.tasks   where user_id = '<user_b_id>';
select count(*) from public.subjects where user_id = '<user_b_id>';
select count(*) from public.topics   where user_id = '<user_b_id>';
```

Expected result: `0` for all queries. RLS policies ensure the query returns nothing even if the row exists.

## Content Security Policy

Enforced via `vercel.json` (and `netlify.toml` for Netlify deploys):

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
connect-src 'self' https://*.supabase.co wss://*.supabase.co;
img-src 'self' data:;
font-src 'self' https://fonts.gstatic.com;
frame-ancestors 'none';
```

`'unsafe-inline'` for styles is required by Tailwind CSS's runtime class injection. See `docs/DECISIONS.md` for the rationale.

## Edge Function Security

- JWT from `Authorization: Bearer` header verified before any processing.
- Input size capped at 8,000 characters; rejected with HTTP 400 if exceeded.
- Per-user rate limit: 10 `parse-syllabus` calls per hour; rejected with HTTP 429 if exceeded.
- API key stored only in Supabase Edge Function secrets; never returned in responses or logged.
- CORS `Access-Control-Allow-Origin` restricted to the app's production origin.

## Data Portability and Erasure

- **Export**: Settings → Privacy & Data → "Export my data" downloads a JSON file of all user rows.
- **Delete**: Settings → Privacy & Data → "Delete my account" triggers account deletion. All rows cascade-delete via `ON DELETE CASCADE` foreign keys defined in migration `001_init.sql`.

## Responsible Disclosure

If you find a security issue, please email: `security@studysync.example` (placeholder — replace before deployment).

Do not open a public GitHub issue for security vulnerabilities.
