# Flutterwave Payment Integration — Setup Guide

## Overview
Payments use Flutterwave's **Mobile Money Cameroon** (MTN MoMo & Orange Money).
- Frontend: Flutterwave Inline JS (popup, no redirect)
- Backend: Supabase Edge Function (secure server-side verification)
- Secret key: NEVER in the browser — only in Edge Function

---

## Step 1 — Get your Flutterwave API keys

1. Go to https://dashboard.flutterwave.com
2. Create an account / log in
3. Go to **Settings → APIs**
4. Copy:
   - **Public key** (starts with `FLWPUBK_TEST-` or `FLWPUBK_LIVE-`)
   - **Secret key** (starts with `FLWSECK_TEST-` or `FLWSECK_LIVE-`)

---

## Step 2 — Add your PUBLIC key to .env

Edit `.env` in the project root:
```
VITE_FLW_PUBLIC_KEY="FLWPUBK_LIVE-youractualkey"
```

---

## Step 3 — Run the SQL migration

In Supabase Dashboard → SQL Editor → New query, run:
```
supabase/migrations/20260326000000_payment_complete.sql
```

---

## Step 4 — Deploy the Edge Function (adds secret key securely)

Install Supabase CLI: https://supabase.com/docs/guides/cli

```bash
# Link your project
supabase login
supabase link --project-ref ruaetazbdirymbloghzn

# Set the SECRET key (never put this in .env!)
supabase secrets set FLW_SECRET_KEY=FLWSECK_LIVE-yoursecretkey

# Deploy the verification function
supabase functions deploy verify-payment
```

The edge function is at: `supabase/functions/verify-payment/index.ts`

---

## Step 5 — Test with Test Mode

For testing, use these Flutterwave test credentials:
- **Public key**: `FLWPUBK_TEST-SANDBOXDEMOKEY-X`
- **Test MoMo number**: `0559090032` (Ghana) or use your test number

When you're ready for production, switch to LIVE keys.

---

## Payment Flow

```
Guest fills form
    ↓
Reservation saved to DB (status: pending)
    ↓
Flutterwave popup opens
    ↓  
Guest enters phone → receives USSD push
    ↓
Guest approves with PIN
    ↓
Flutterwave calls our callback with transaction_id
    ↓
Edge Function verifies with Flutterwave API (secret key)
    ↓
DB updated: payment_status=paid, status=confirmed
    ↓
WhatsApp notification sent to owner
    ↓
Guest sees confirmation screen
```

## Security
- Secret key stored only in Supabase Edge Function secrets (encrypted)
- Amount verified server-side (prevents tampering)
- Currency verified (XAF only)
- PCI-DSS compliant (Flutterwave handles card/MoMo data)
