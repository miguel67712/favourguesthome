# Role-Based System — Favour Guest Homes

## How It Works

### Two Roles, Two Experiences

| Role | Access | URL |
|------|--------|-----|
| **Guest (Client)** | View rooms, availability, book, leave reviews | `/` |
| **Admin** | Manage rooms, photos, availability, reservations | `/admin` |

---

## Admin Setup

### Admin Email
The admin email is hardcoded in the database: **`favourguesthomes@gmail.com`**

### Steps to Activate Admin
1. Go to your **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add user"** → enter `favourguesthomes@gmail.com` and set a password
3. The database trigger automatically assigns `admin` role on signup
4. Log in at `/admin/login` with those credentials

> **Alternative:** If the user already exists, run the latest migration (`20260318000000_admin_role_fix.sql`) in the Supabase SQL editor — it retroactively assigns the admin role.

---

## Admin Dashboard Features

### Room Management
Each room card has 3 action buttons:

1. **Toggle Availability** — Switch between "Available" and "Occupied"
   - Changes are **real-time** — all client browsers update within seconds via Supabase realtime
   
2. **Edit Details** — Modify name, type, price, description, amenities
   - Clients see updates instantly
   
3. **Photos** — Upload and delete room photos
   - Uploads go to Supabase Storage (`room-images` bucket)
   - Clients see new/removed photos immediately

### Add / Delete Rooms
- Add new rooms with the **"+ Add Room"** button
- Delete rooms (also removes their photos from storage)

### Reservations
- View all guest reservation requests
- Confirm or cancel pending reservations

---

## Real-Time Client Updates

The client page (`/`) auto-updates via:
1. **Supabase Realtime** — Postgres changes stream directly to browser
2. **4-second polling** — Fallback for reliability
3. **localStorage sync** — Triggers update across browser tabs when admin makes changes
4. **Window focus / visibility events** — Refreshes when guest returns to tab

---

## Running the Project

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Environment variables required (already in `.env`):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
