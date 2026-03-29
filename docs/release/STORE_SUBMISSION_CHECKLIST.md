# Store Submission Checklist

## Code and backend status already handled
- Public legal routes now work before login:
  - `/terms`
  - `/privacy`
  - `/contact`
  - `/account-deletion`
- In-app support / privacy / deletion / safety requests now save into `public.support_requests`.
- Remote database migration pushed:
  - `20260327000036_support_requests_and_privacy_hardening.sql`
- `public.users` read access is now self-only instead of all-authenticated-users.
- Parent and babysitter report actions now open the in-app safety request flow instead of a mail draft.
- Babysitter minimum onboarding age is now `18`.
- Release config files now exist:
  - [`app.json`](/Users/shaked/Code/babysit-connect/app.json)
  - [`eas.json`](/Users/shaked/Code/babysit-connect/eas.json)

## Must finish before App Store / Google Play submission

### 1. Phone auth verification
- Confirm Supabase phone auth is enabled in Authentication -> Providers.
- Confirm production SMS delivery works for Israeli phone numbers.
- Prepare a reviewer-safe phone login path:
  - test number / OTP instructions, or
  - a live review number that can receive OTPs during review

### 2. EAS / push setup
- Create or link the EAS project.
- Add the real EAS project ID under:
  - `expo.extra.eas.projectId` in [`app.json`](/Users/shaked/Code/babysit-connect/app.json)
- Build once for iOS and Android and confirm push token registration works.

### 3. Store-facing legal URLs
- Deploy the Expo web build or another hosted site so these pages are public URLs:
  - `/privacy`
  - `/terms`
  - `/contact`
  - `/account-deletion`
- Use those same URLs in:
  - App Store Connect privacy policy URL
  - Google Play privacy policy URL
  - Google Play account deletion URL

### 4. Reviewer access
- Prepare working reviewer access:
  - test phone auth flow / OTP instructions
- Make sure the reviewer account only sees clean demo-safe content.

### 5. Seed/demo content cleanup
- Remove unsafe, off-brand, or inappropriate profile photos/messages from the review dataset.
- Verify screenshots and seeded profiles fit a childcare marketplace.

### 6. Photo privacy hardening
- Parent and babysitter profile photos are still served from public buckets today.
- Before launch, migrate these to private storage with signed URLs or a controlled media proxy.

### 7. UGC safety minimums
- Add an actual in-app `block user` flow.
- Add an internal moderation/admin workflow for submitted safety reports.
- Document who handles reports and expected response time.

## Apple-specific checks
- Verify the iOS permission prompt copy is acceptable for review.
- Confirm account deletion can be initiated inside the app without requiring the Mail app.
- Confirm the built app shows the correct display name: `Smartaf`.

## Google-specific checks
- Confirm the public account deletion page is reachable without login.
- Fill the Data safety form from the real built app behavior, not assumptions.
- Verify account deletion request flow is visible from Settings.

## Final pre-submit smoke test
- `npx tsc --noEmit`
- iOS production build succeeds
- Android production build succeeds
- phone OTP login works
- support/privacy/delete/safety request form inserts rows successfully
- notification permission prompt appears only after explicit user action
- no broken footer legal links while logged out
