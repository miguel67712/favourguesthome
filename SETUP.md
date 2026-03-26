# Favour Guest Homes — Setup Guide

## Admin Credentials
- **Email:** favourguesthomes@gmail.com
- **Password:** F@4our237
- **Admin URL:** /admin/login

---

## One-Time Setup (Do This First)

### Step 1 — Run the admin user migration

Go to your **Supabase Dashboard**:
1. Open project `ruaetazbdirymbloghzn`
2. Click **SQL Editor** in the left sidebar
3. Click **"New query"**
4. Copy the entire contents of `supabase/migrations/20260318100000_create_admin_user.sql`
5. Paste it in the editor and click **Run**

This creates the admin user account with the correct password and assigns the admin role.

### Step 2 — Verify admin user exists (optional check)

Run this in the SQL Editor to confirm:
```sql
SELECT u.email, r.role
FROM auth.users u
JOIN public.user_roles r ON r.user_id = u.id
WHERE u.email = 'favourguesthomes@gmail.com';
```
You should see one row: `favourguesthomes@gmail.com | admin`

### Step 3 — Run the app

```bash
npm install
npm run dev
```

### Step 4 — Login
Go to `http://localhost:5173/admin/login` and enter:
- Email: `favourguesthomes@gmail.com`
- Password: `F@4our237`

---

## How the Role System Works

| Person | URL | What they see |
|--------|-----|---------------|
| Guest | `/` | Rooms, availability, reviews, reservation form — **no login needed** |
| Admin | `/admin` | Full dashboard — protected, redirects to login if not signed in |

### Real-time updates
When admin changes anything (availability, photos, details), the client page at `/` **updates automatically** in all open browsers within seconds via:
- Supabase Realtime (Postgres CDC)
- 4-second polling fallback
- localStorage cross-tab events

---

## Admin Dashboard Features

### Toggle Availability
Click **"Mark as Occupied"** or **"Mark as Available"** on any room card.
→ All clients see the change instantly.

### Edit Room Details
Click the **Edit** button on a room card.
→ Change name, type, price, description, amenities.
→ Clients see changes immediately.

### Manage Photos
Click the **Photos** button on a room card.
→ Upload new photos (multiple at once supported).
→ Click any thumbnail + "Remove" to delete a photo.
→ Photos stored in Supabase Storage `room-images` bucket.
→ Clients see changes immediately.

### Add Room
Click **"+ Add Room"** at the top right of the Rooms tab.

### Delete Room
Click the trash icon on a room card. Confirms before deleting.
→ Also cleans up all photos from storage.

### Manage Reservations
Click the **Reservations** tab to see all bookings.
→ Confirm or cancel pending reservations.
