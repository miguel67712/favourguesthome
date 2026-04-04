# Supabase Setup — Step by Step Guide
# Favour Guest Homes

Follow these steps exactly. Takes about 10 minutes.

---

## STEP 1 — Create a new Supabase project

1. Go to https://supabase.com
2. Click **"Start your project"** → sign up or log in
3. Click **"New project"**
4. Fill in:
   - **Organization**: your name or "Favour Guest Homes"
   - **Project name**: `favour-guest-homes`
   - **Database password**: make a strong password and SAVE IT somewhere safe
   - **Region**: pick **Europe West** or **US East** (closest to Cameroon)
5. Click **"Create new project"**
6. Wait about 2 minutes for it to set up

---

## STEP 2 — Get your project keys

1. In your new project, click **"Settings"** (gear icon, left sidebar)
2. Click **"API"**
3. You will see:
   - **Project URL** — looks like `https://XXXXX.supabase.co`
   - **anon public key** — a long string starting with `eyJ...`
4. Copy BOTH of these — you need them in Step 5

---

## STEP 3 — Run the database setup SQL

1. In your Supabase project, click **"SQL Editor"** (left sidebar)
2. Click **"New query"**
3. Open the file `SUPABASE_DB_SETUP.sql` from this project folder
4. Copy the ENTIRE contents of that file
5. Paste it into the SQL editor
6. Click the green **"Run"** button
7. You should see at the bottom:
   - A list of tables: rooms, reviews, reservations, user_roles
   - A list of policies (9 rows)
   - Some sample rooms and reviews already inserted

---

## STEP 4 — Create your admin account

1. In Supabase, click **"Authentication"** (left sidebar)
2. Click **"Users"**
3. Click **"Add user"** → **"Create new user"**
4. Fill in:
   - **Email**: `favourguesthomes@gmail.com`
   - **Password**: `F@4our237`
5. Click **"Create user"**
6. The database will automatically give this email admin rights

---

## STEP 5 — Update your project .env file

Open the `.env` file in the project folder and replace the values:

```
VITE_SUPABASE_URL="https://YOUR-PROJECT-ID.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJ...your-anon-key..."
```

Replace with the values you copied in Step 2.

---

## STEP 6 — Update the client.ts file

Open `src/integrations/supabase/client.ts` and update these two lines:

```typescript
const SUPABASE_URL  = "https://YOUR-PROJECT-ID.supabase.co";
const SUPABASE_ANON = "eyJ...your-anon-key...";
```

---

## STEP 7 — Test it works

1. Run `npm run dev` in the project folder
2. Go to http://localhost:3737
3. Try making a booking — it should work with no errors
4. Log in at http://localhost:3737 with `favourguesthomes@gmail.com`
5. You should land on the admin dashboard and see the booking you just made

---

## That's it! ✅

Your database is set up fresh with no conflicts.
