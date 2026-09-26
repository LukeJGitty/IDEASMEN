# Deploying Hippo (Vercel + Supabase)

This puts Hippo on a public HTTPS address with its own hosted database, the fictional demo data and real AI. Both services have free plans; the only running cost is OpenAI usage. Get the owner's OK before creating projects or turning on paid AI (see AGENTS.md).

Time needed: about 30 minutes.

## What goes where

| Thing | Where it lives | Never put it in |
| --- | --- | --- |
| Supabase URL and publishable key | Vercel environment variables, `.env.local` | (safe to expose; RLS protects the data) |
| OpenAI API key | Vercel environment variables (mark Sensitive), `.env.local` | Git, chat, screenshots |
| Supabase secret (service role) key | `.env.seed.local` on your computer, only for loading demo data | Vercel, Git, chat |

## 1. Create the hosted database (Supabase)

1. Sign in at [supabase.com](https://supabase.com), **New project**. Name it `hippo-demo`, choose region **Sydney (ap-southeast-2)**, and save the database password somewhere safe.
2. When it is ready, open **Project Settings → General** and copy the **Project ID** (a short code like `abcdefghijkl`).
3. In Terminal, in the IDEASMEN folder:

   ```sh
   pnpm supabase login                              # opens the browser once to approve
   pnpm supabase link --project-ref <Project ID>    # asks for the database password
   pnpm supabase db push                            # creates every table, rule and the audio bucket
   ```

4. **Authentication → Emails → Templates**: for both **Magic link** and **Confirm signup**, set the subject to `Your sign-in code` and paste the contents of `supabase/templates/magic-link.html` as the body. The `{{ .Token }}` line must stay: Hippo asks for a code, not a link.
5. **Authentication → URL Configuration → Site URL**: set this after step 3 of the Vercel section, to your Vercel address.

### Sign-in emails

Supabase's built-in email only sends to members of your Supabase organisation, and only about 2 emails an hour. For a demo that is usually enough, because you stay signed in on each device until you sign out:

- Invite each teammate to the Supabase organisation (**Organization settings → Team**) so their codes can be delivered.
- Sign in on the demo laptop before presenting.

To send codes to anyone, and more often, add your own email sender under **Authentication → Emails → SMTP settings**. Any SMTP service works. For example, a Gmail account with an [app password](https://support.google.com/accounts/answer/185833) (host `smtp.gmail.com`, port `465`) sends a few hundred a day for free. Only the account owner should type that password into Supabase.

## 2. Load the demo data

1. In Supabase, **Project Settings → API Keys**: copy the project URL and a **secret** key.
2. In the IDEASMEN folder create a file named `.env.seed.local` (Git ignores it):

   ```sh
   SEED_SUPABASE_URL=https://<Project ID>.supabase.co
   SEED_SUPABASE_SERVICE_ROLE_KEY=<secret key>
   SEED_CLINICIANS=you@example.com:Dr Your Name,teammate@example.com:Dr Their Name
   ```

   Use your team's real email addresses: on the hosted site, sign-in codes are really emailed. These accounts are approved as clinicians; anyone else who signs up sees "not authorised" and cannot read patients or use the AI.

3. Run `pnpm db:seed-hosted`. It loads the 8 fictional patients, consultations, tasks and a week of roster (doctors and round-the-clock ward nurses), timed relative to now. Re-run it any time to refresh the demo. It refuses to run against a project that contains non-demo patients.

## 3. Deploy the website (Vercel)

1. Sign in at [vercel.com](https://vercel.com) with GitHub, **Add New → Project**, and import **IDEASMEN**. The repository belongs to Luke's GitHub account, so if Vercel cannot see it, ask Luke to do this step or to give Vercel access to the repository.
2. Before the first deploy, open **Environment Variables** and add these for Production:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<Project ID>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the **publishable** key from Project Settings → API Keys |
   | `TRANSCRIPTION_PROVIDER` | `openai` |
   | `NOTE_PROVIDER` | `openai` |
   | `OPENAI_API_KEY` | your OpenAI key (tick **Sensitive**) |

   Optional: `OPENAI_TRANSCRIBE_MODEL` and `OPENAI_NOTE_MODEL`, if you want other models than the defaults. For free, placeholder AI, leave the providers out (they default to `mock`).

3. Click **Deploy**. `vercel.json` sets the install and build commands and runs the server in Sydney, next to the database. When it finishes, copy your address (for example `https://ideasmen.vercel.app`) into Supabase's **Site URL** (section 1, step 5).

Every merge to `main` now redeploys automatically. After changing an environment variable, redeploy from the Vercel **Deployments** page.

## 4. Check it works

On the Vercel address, on a phone and a laptop:

1. Sign in with one of the `SEED_CLINICIANS` emails. The code arrives by email (the local pop-up is switched off on the live site).
2. The dashboard shows today's team, tasks, results to chase and follow-ups. The dot next to "updated" should say **Live**.
3. Open NHI `ZZZ0075` (Sione), generate the AI draft and finalise it. Watch the task count update on a second device.
4. Record a short consultation and check the transcript appears. Recordings up to about 18 minutes fit Vercel's 4.5 MB upload limit.
5. Sign in with an email that is not a clinician and confirm it sees "not authorised".

## Troubleshooting

- **"We couldn't send a code"**: the email is not in your Supabase organisation, or the hourly email limit was hit. Wait, or set up SMTP.
- **The email has a link instead of a code**: the email templates (section 1, step 4) are not saved.
- **The page says to set up Supabase**: the two `NEXT_PUBLIC_` variables are missing. Add them and redeploy.
- **AI step fails with 401**: the OpenAI key in Vercel is wrong. **404**: the model name is wrong; remove the optional model variables.
- **Dashboard says Auto-refresh instead of Live**: run `pnpm supabase db push` again so the realtime migration is applied.
