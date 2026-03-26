import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut, Plus, X, CheckCircle, XCircle, Clock, Trash2, RefreshCw,
  Upload, Image as ImageIcon, Edit3, Save, ToggleLeft, ToggleRight,
  BedDouble, Camera, Pencil, Eye, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatPrice, getRoomTypeLabel } from "@/lib/roomsData";
import type { Tables } from "@/integrations/supabase/types";
import logo from "@/assets/logo.png";
import room1 from "@/assets/room1.png";
import room2 from "@/assets/room2.png";
import room3 from "@/assets/room3.png";
import room4 from "@/assets/room4.png";

type Room = Tables<"rooms">;
type Reservation = Tables<"reservations">;

const fallbackImages = [room1, room2, room3, room4];
const STANDARD_AMENITIES = ["AC", "TV", "Fridge", "Private Bathroom", "Hot & Cold Water", "Gas", "24/7 Security", "WiFi"];
const inp = "w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary transition outline-none";

// ─────────────────────────────────────────────────────────────────
// EDIT ROOM MODAL
// ─────────────────────────────────────────────────────────────────
const EditRoomModal = ({
  room, onClose, onSaved,
}: { room: Room; onClose: () => void; onSaved: (r: Room) => void }) => {
  const [form, setForm] = useState({
    name: room.name,
    type: room.type,
    price: room.price,
    description: room.description,
    amenities: room.amenities.join(", "),
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Room name is required"); return; }
    setSaving(true);
    const amenities = Array.from(new Set([
      ...STANDARD_AMENITIES,
      ...form.amenities.split(",").map(a => a.trim()).filter(Boolean),
    ]));
    const { data, error } = await supabase
      .from("rooms")
      .update({ name: form.name, type: form.type, price: form.price, description: form.description, amenities })
      .eq("id", room.id)
      .select()
      .single();
    setSaving(false);
    if (error) { toast.error("Save failed — check connection"); return; }
    toast.success("Room updated ✓ — clients see this instantly");
    onSaved(data);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 32, scale: 0.97 }}
          transition={{ type: "spring", damping: 30, stiffness: 340 }}
          className="bg-card rounded-2xl border border-border shadow-card w-full max-w-lg overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
              <Pencil size={15} className="text-primary" /> Edit Room Details
            </h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition p-1 rounded-lg"><X size={18} /></button>
          </div>

          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Room Name</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Type</label>
                <select value={form.type} onChange={e => { const t = e.target.value; setForm(p => ({ ...p, type: t, price: t === "apartment" ? 25000 : t === "studio" ? 15000 : 10000 })); }} className={inp}>
                  <option value="single">Single Room</option>
                  <option value="studio">Studio</option>
                  <option value="apartment">Apartment</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Price / night (XAF)</label>
                <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} className={inp} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} className={`${inp} resize-none`} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Extra Amenities <span className="normal-case font-normal">(comma-separated — standard ones always added)</span>
              </label>
              <input value={form.amenities} onChange={e => setForm(p => ({ ...p, amenities: e.target.value }))} placeholder="Balcony, Washing Machine, Parking…" className={inp} />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 gradient-primary text-primary-foreground py-2.5 rounded-xl font-semibold shadow-warm hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─────────────────────────────────────────────────────────────────
// IMAGE MANAGER MODAL
// ─────────────────────────────────────────────────────────────────
const ImageManagerModal = ({
  room, onClose, onSaved,
}: { room: Room; onClose: () => void; onSaved: () => void }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>(room.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);
  const [previewIdx, setPreviewIdx] = useState(0);

  // Use fallbacks for preview if no custom images
  const display = images.length > 0 ? images : fallbackImages.slice(0, 2);
  const safeIdx = Math.min(previewIdx, display.length - 1);

  const uploadFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    const added: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) { toast.error(`${file.name} is not an image`); continue; }
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${room.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("room-images").upload(path, file, { upsert: true });
      if (upErr) { toast.error(`Upload failed: ${file.name}`); continue; }
      const { data: urlData } = supabase.storage.from("room-images").getPublicUrl(path);
      added.push(urlData.publicUrl);
    }

    if (added.length) {
      const updated = [...images, ...added];
      const { error } = await supabase.from("rooms").update({ images: updated }).eq("id", room.id);
      if (error) { toast.error("Failed to save — try again"); } else {
        setImages(updated);
        setPreviewIdx(updated.length - 1);
        toast.success(`${added.length} photo${added.length > 1 ? "s" : ""} added ✓ — clients see this now`);
        onSaved();
      }
    }
    setUploading(false);
  };

  const deleteImage = async (idx: number) => {
    if (images.length === 0) return; // can't delete fallback
    setDeletingIdx(idx);
    const imgUrl = images[idx];
    // Extract path after bucket name for storage deletion
    const marker = "/room-images/";
    const markerIdx = imgUrl.indexOf(marker);
    if (markerIdx !== -1) {
      const storagePath = decodeURIComponent(imgUrl.slice(markerIdx + marker.length));
      await supabase.storage.from("room-images").remove([storagePath]);
    }
    const updated = images.filter((_, i) => i !== idx);
    const { error } = await supabase.from("rooms").update({ images: updated }).eq("id", room.id);
    setDeletingIdx(null);
    if (error) { toast.error("Failed to remove photo"); return; }
    setImages(updated);
    setPreviewIdx(p => Math.max(0, p >= updated.length ? updated.length - 1 : p));
    toast.success("Photo removed ✓ — clients see this now");
    onSaved();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 32, scale: 0.97 }}
          transition={{ type: "spring", damping: 30, stiffness: 340 }}
          className="bg-card rounded-2xl border border-border shadow-card w-full max-w-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
              <Camera size={15} className="text-primary" /> Manage Photos — {room.name}
            </h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition p-1 rounded-lg"><X size={18} /></button>
          </div>

          <div className="p-5">
            {/* Main preview */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-muted mb-4 group">
              <img src={display[safeIdx]} alt="" className="w-full h-full object-cover" />

              {/* Nav arrows */}
              {display.length > 1 && (
                <>
                  <button
                    onClick={() => setPreviewIdx(p => (p - 1 + display.length) % display.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 transition"
                  ><ChevronLeft size={16} /></button>
                  <button
                    onClick={() => setPreviewIdx(p => (p + 1) % display.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 transition"
                  ><ChevronRight size={16} /></button>
                </>
              )}

              {/* Delete button — only for real uploaded images */}
              {images.length > 0 && (
                <button
                  onClick={() => deleteImage(safeIdx)}
                  disabled={deletingIdx === safeIdx}
                  className="absolute top-3 right-3 bg-destructive/90 text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 hover:bg-destructive transition disabled:opacity-60"
                >
                  {deletingIdx === safeIdx ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Remove
                </button>
              )}

              {/* Counter */}
              <div className="absolute bottom-3 left-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
                {safeIdx + 1} / {display.length}
                {images.length === 0 && <span className="ml-1 opacity-70">(preview)</span>}
              </div>
            </div>

            {/* Thumbnail strip */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              {display.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setPreviewIdx(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    i === safeIdx ? "border-primary scale-105 shadow-warm" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}

              {/* Add tile */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-primary/40 flex flex-col items-center justify-center gap-0.5 text-primary hover:border-primary hover:bg-primary/5 transition disabled:opacity-50"
              >
                {uploading ? <RefreshCw size={16} className="animate-spin" /> : <>
                  <Upload size={16} />
                  <span className="text-[9px] font-bold uppercase tracking-wide">Add</span>
                </>}
              </button>
            </div>

            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => { uploadFiles(e.target.files); e.target.value = ""; }} />

            {/* Upload CTA */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-primary/30 text-primary text-sm font-semibold hover:border-primary hover:bg-primary/5 transition disabled:opacity-50"
            >
              {uploading ? <><RefreshCw size={14} className="animate-spin" /> Uploading…</> : <><Upload size={14} /> Upload Photos</>}
            </button>

            <p className="text-xs text-muted-foreground text-center mt-3">
              {images.length === 0
                ? "No custom photos yet — fallback images shown to guests. Upload yours above."
                : `${images.length} photo${images.length !== 1 ? "s" : ""} uploaded. All changes update clients in real-time.`}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─────────────────────────────────────────────────────────────────
// ADD ROOM MODAL
// ─────────────────────────────────────────────────────────────────
const AddRoomModal = ({
  onClose, onAdded,
}: { onClose: () => void; onAdded: () => void }) => {
  const [form, setForm] = useState({ name: "", type: "single", price: 10000, description: "" });
  const [extraAmenities, setExtraAmenities] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error("Room name is required"); return; }
    setSaving(true);
    const amenities = Array.from(new Set([
      ...STANDARD_AMENITIES,
      ...extraAmenities.split(",").map(a => a.trim()).filter(Boolean),
    ]));
    const { error } = await supabase.from("rooms").insert({
      name: form.name.trim(),
      type: form.type,
      price: form.price,
      description: form.description.trim() || "A comfortable room with all standard amenities.",
      amenities,
      images: [],
      occupied: false,
    });
    setSaving(false);
    if (error) { toast.error("Failed to add room"); return; }
    toast.success("Room added ✓ — visible to clients immediately");
    onAdded();
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 32, scale: 0.97 }}
          transition={{ type: "spring", damping: 30, stiffness: 340 }}
          className="bg-card rounded-2xl border border-border shadow-card w-full max-w-lg overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
              <BedDouble size={15} className="text-primary" /> Add New Room
            </h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition p-1 rounded-lg"><X size={18} /></button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Room Name</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Room 10" className={inp} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Type</label>
                <select value={form.type} onChange={e => { const t = e.target.value; setForm(p => ({ ...p, type: t, price: t === "apartment" ? 25000 : t === "studio" ? 15000 : 10000 })); }} className={inp}>
                  <option value="single">Single — 10,000 XAF</option>
                  <option value="studio">Studio — 15,000 XAF</option>
                  <option value="apartment">Apartment — 25,000 XAF</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Price (XAF)</label>
                <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} className={inp} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the room…" rows={2} className={`${inp} resize-none`} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Extra Amenities <span className="normal-case font-normal">(standard ones auto-included)</span>
              </label>
              <input value={extraAmenities} onChange={e => setExtraAmenities(e.target.value)} placeholder="Balcony, Parking, Washing Machine…" className={inp} />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition">Cancel</button>
              <button onClick={handleAdd} disabled={saving} className="flex-1 gradient-primary text-primary-foreground py-2.5 rounded-xl font-semibold shadow-warm hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                {saving ? "Adding…" : "Add Room"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tab, setTab] = useState<"rooms" | "reservations">("rooms");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [photosRoom, setPhotosRoom] = useState<Room | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/", { replace: true });
  }, [loading, user, isAdmin, navigate]);

  const fetchRooms = async () => {
    const { data } = await supabase.from("rooms").select("*").order("created_at");
    if (data) setRooms(data);
  };

  const fetchReservations = async () => {
    const { data } = await supabase.from("reservations").select("*").order("created_at", { ascending: false });
    if (data) setReservations(data);
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchRooms();
    fetchReservations();

    // Real-time subscriptions — clients also subscribed to same table
    const roomCh = supabase.channel("admin-rooms-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, fetchRooms)
      .subscribe();
    const resCh = supabase.channel("admin-reservations-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, fetchReservations)
      .subscribe();

    return () => { supabase.removeChannel(roomCh); supabase.removeChannel(resCh); };
  }, [isAdmin]);

  // Cross-tab notification for same-device clients
  const notifyClients = () => localStorage.setItem("fg-last-room-sync", Date.now().toString());

  const toggleOccupied = async (room: Room) => {
    setTogglingId(room.id);
    const newVal = !room.occupied;
    const { error } = await supabase.from("rooms").update({ occupied: newVal }).eq("id", room.id);
    setTogglingId(null);
    if (error) { toast.error("Update failed — check connection"); return; }
    toast.success(`${room.name} → ${newVal ? "Occupied" : "Available"} ✓`);
    notifyClients();
    fetchRooms();
  };

  const deleteRoom = async (id: string) => {
    if (!window.confirm("Permanently delete this room and all its photos?")) return;
    setDeletingId(id);
    // Clean up storage images
    const room = rooms.find(r => r.id === id);
    if (room?.images?.length) {
      const paths = room.images.map(url => {
        const m = "/room-images/";
        const i = url.indexOf(m);
        return i !== -1 ? decodeURIComponent(url.slice(i + m.length)) : null;
      }).filter(Boolean) as string[];
      if (paths.length) await supabase.storage.from("room-images").remove(paths);
    }
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    setDeletingId(null);
    if (error) { toast.error("Delete failed"); return; }
    toast.success("Room deleted ✓");
    notifyClients();
    fetchRooms();
  };

  const updateReservationStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
    if (error) { toast.error("Update failed"); return; }
    toast.success(`Reservation ${status} ✓`);
    fetchReservations();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <RefreshCw className="animate-spin text-primary" size={30} />
    </div>
  );
  if (!isAdmin) return null;

  const totalAvailable = rooms.filter(r => !r.occupied).length;
  const totalOccupied = rooms.filter(r => r.occupied).length;
  const pendingCount = reservations.filter(r => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="bg-card border-b border-border sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="FG" className="h-11 w-11 rounded-xl object-contain" />
            <div>
              <h1 className="font-display text-base font-bold text-foreground leading-tight">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a href="/home" target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition">
              <Eye size={13} /> View Site
            </a>
            <button
              onClick={async () => { await signOut(); navigate("/", { replace: true }); }}
              className="flex items-center gap-1.5 text-sm text-destructive hover:opacity-75 transition"
            >
              <LogOut size={13} /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-7">
        {/* ── Stats ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Rooms", value: rooms.length, cls: "text-foreground", pulse: false },
            { label: "Available", value: totalAvailable, cls: "text-available", pulse: true },
            { label: "Occupied", value: totalOccupied, cls: "text-occupied", pulse: false },
            { label: "Pending Bookings", value: pendingCount, cls: "text-primary", pulse: false },
          ].map(({ label, value, cls, pulse }) => (
            <div key={label} className="bg-card rounded-2xl p-4 border border-border shadow-card">
              <p className="text-muted-foreground text-xs mb-1">{label}</p>
              <p className={`font-display text-3xl font-bold ${cls} flex items-center gap-2`}>
                {value}
                {pulse && value > 0 && <span className="w-2 h-2 rounded-full bg-available animate-pulse" />}
              </p>
            </div>
          ))}
        </div>

        {/* ── Tabs ──────────────────────────────────────────── */}
        <div className="flex gap-2 mb-6 flex-wrap items-center">
          {(["rooms", "reservations"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
                tab === t
                  ? "gradient-primary text-primary-foreground shadow-warm"
                  : "bg-card text-muted-foreground border border-border hover:text-foreground"
              }`}
            >
              {t === "rooms" ? `Rooms (${rooms.length})` : `Reservations${pendingCount > 0 ? ` · ${pendingCount} pending` : ""}`}
            </button>
          ))}
          {tab === "rooms" && (
            <button onClick={() => setShowAddModal(true)}
              className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border-2 border-dashed border-primary text-primary hover:bg-primary/10 transition">
              <Plus size={14} /> Add Room
            </button>
          )}
        </div>

        {/* ── Rooms Grid ────────────────────────────────────── */}
        {tab === "rooms" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rooms.map(room => {
              const thumb = room.images?.[0] ?? fallbackImages[rooms.indexOf(room) % fallbackImages.length];
              return (
                <motion.div key={room.id} layout className="bg-card rounded-2xl border border-border shadow-card overflow-hidden group">
                  {/* Thumbnail */}
                  <div className="relative h-44 overflow-hidden bg-muted">
                    <img src={thumb} alt={room.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {/* Availability badge */}
                    <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                      room.occupied ? "bg-occupied text-occupied-foreground" : "bg-available text-available-foreground"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full bg-current ${!room.occupied ? "animate-pulse" : ""}`} />
                      {room.occupied ? "Occupied" : "Available"}
                    </div>
                    {/* Type badge */}
                    <div className="absolute top-3 right-3 bg-foreground/60 text-primary-foreground px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
                      {getRoomTypeLabel(room.type as any)}
                    </div>
                    {/* Photo count */}
                    {room.images && room.images.length > 0 && (
                      <div className="absolute bottom-3 left-3 bg-black/50 text-white text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Camera size={9} /> {room.images.length}
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-display font-bold text-foreground leading-tight">{room.name}</h3>
                      <span className="text-primary font-bold text-sm whitespace-nowrap ml-2">{formatPrice(room.price)}</span>
                    </div>
                    <p className="text-muted-foreground text-xs line-clamp-2 mb-4 leading-relaxed">{room.description}</p>

                    {/* ── Toggle availability (prominent) ── */}
                    <button
                      onClick={() => toggleOccupied(room)}
                      disabled={togglingId === room.id}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition mb-2 ${
                        room.occupied
                          ? "bg-available/15 text-available hover:bg-available/25 border border-available/30"
                          : "bg-occupied/15 text-occupied hover:bg-occupied/25 border border-occupied/30"
                      } disabled:opacity-60`}
                    >
                      {togglingId === room.id
                        ? <RefreshCw size={14} className="animate-spin" />
                        : room.occupied ? <ToggleLeft size={16} /> : <ToggleRight size={16} />
                      }
                      {togglingId === room.id ? "Updating…" : room.occupied ? "Mark as Available" : "Mark as Occupied"}
                    </button>

                    {/* ── Secondary actions ── */}
                    <div className="flex gap-2">
                      <button onClick={() => setEditingRoom(room)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition border border-primary/20">
                        <Edit3 size={12} /> Edit
                      </button>
                      <button onClick={() => setPhotosRoom(room)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition border border-border">
                        <Camera size={12} /> Photos
                      </button>
                      <button onClick={() => deleteRoom(room.id)} disabled={deletingId === room.id}
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition border border-destructive/20 disabled:opacity-60">
                        {deletingId === room.id ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ── Reservations ──────────────────────────────────── */}
        {tab === "reservations" && (
          <div className="space-y-3">
            {reservations.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <BedDouble size={40} className="mx-auto mb-3 opacity-20" />
                <p>No reservations yet.</p>
              </div>
            ) : reservations.map(res => {
              const payStatus = (res as any).payment_status as string | undefined;
              const txId      = (res as any).transaction_id as string | undefined;
              const payMethod = (res as any).payment_method as string | undefined;
              const amtPaid   = (res as any).amount_paid as number | undefined;

              const payColor =
                payStatus === "paid"                 ? "bg-available/15 text-available border-available/30"
                : payStatus === "pending_verification" ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                : payStatus === "failed"               ? "bg-occupied/15 text-occupied border-occupied/30"
                : "bg-secondary text-muted-foreground border-border";

              const payLabel =
                payStatus === "paid"                  ? "✓ Paid"
                : payStatus === "pending_verification" ? "⏳ Verifying"
                : payStatus === "failed"               ? "✗ Failed"
                : "Unpaid";

              return (
                <motion.div key={res.id} layout className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
                  <div className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-display font-bold text-foreground">{res.guest_name}</h3>
                          {payStatus && payStatus !== "unpaid" && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${payColor}`}>{payLabel}</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{res.phone} · {getRoomTypeLabel(res.room_type as any)}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(res.check_in).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          {" → "}
                          {new Date(res.check_out).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                        {res.message && <p className="text-xs text-muted-foreground mt-1 italic">"{res.message}"</p>}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                          res.status === "confirmed" ? "bg-available/15 text-available border border-available/30"
                          : res.status === "cancelled" ? "bg-occupied/15 text-occupied border border-occupied/30"
                          : "bg-primary/15 text-primary border border-primary/30"
                        }`}>
                          {res.status === "confirmed" ? <><CheckCircle size={11} /> Confirmed</>
                          : res.status === "cancelled" ? <><XCircle size={11} /> Cancelled</>
                          : <><Clock size={11} /> Pending</>}
                        </span>
                        {res.status === "pending" && (<>
                          <button onClick={() => updateReservationStatus(res.id, "confirmed")}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-available/10 text-available hover:bg-available/20 transition border border-available/30">
                            Confirm
                          </button>
                          <button onClick={() => updateReservationStatus(res.id, "cancelled")}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-occupied/10 text-occupied hover:bg-occupied/20 transition border border-occupied/30">
                            Cancel
                          </button>
                        </>)}
                      </div>
                    </div>

                    {/* Payment info panel */}
                    {(payStatus && payStatus !== "unpaid") && (
                      <div className={`mt-4 rounded-xl border p-3 ${payColor}`}>
                        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                          <span>💳 {payMethod === "mtn_momo" ? "MTN MoMo" : payMethod === "orange_money" ? "Orange Money" : payMethod ?? "—"}</span>
                          {amtPaid && <span>💰 {amtPaid.toLocaleString()} XAF</span>}
                          {txId && (
                            <span className="font-mono bg-white/60 px-2 py-0.5 rounded-lg border border-current/20">
                              TxID: {txId}
                            </span>
                          )}
                          {payStatus === "pending_verification" && (
                            <button
                              onClick={async () => {
                                await supabase.from("reservations").update({ payment_status: "paid" } as any).eq("id", res.id);
                                toast.success("Payment marked as verified ✓");
                                fetchReservations();
                              }}
                              className="ml-auto px-3 py-1 rounded-lg bg-available/20 text-available border border-available/40 hover:bg-available/30 transition text-xs font-bold"
                            >
                              ✓ Mark as Paid
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────── */}
      {showAddModal && <AddRoomModal onClose={() => setShowAddModal(false)} onAdded={() => { fetchRooms(); notifyClients(); }} />}
      {editingRoom && (
        <EditRoomModal
          room={editingRoom}
          onClose={() => setEditingRoom(null)}
          onSaved={updated => {
            setRooms(prev => prev.map(r => r.id === updated.id ? updated : r));
            notifyClients();
          }}
        />
      )}
      {photosRoom && (
        <ImageManagerModal
          room={photosRoom}
          onClose={() => setPhotosRoom(null)}
          onSaved={() => { fetchRooms(); notifyClients(); }}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
