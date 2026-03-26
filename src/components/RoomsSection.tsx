import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Eye, Fuel, Shield, Snowflake, Tv, Droplets, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { publicSupabase, supabase } from "@/integrations/supabase/client";
import { getRoomTypeLabel, formatPrice } from "@/lib/roomsData";
import { useLang } from "@/hooks/useLang";
import type { Tables } from "@/integrations/supabase/types";
import RoomDetailModal from "./RoomDetailModal";
import room1 from "@/assets/room1.png";
import room2 from "@/assets/room2.png";
import room3 from "@/assets/room3.png";
import room4 from "@/assets/room4.png";

type Room = Tables<"rooms">;
type RoomType = "single" | "studio" | "apartment";
const fallbackImages = [room1, room2, room3, room4];

const RoomsSection = () => {
  const [rooms, setRooms]           = useState<Room[]>([]);
  const [filter, setFilter]         = useState<"all" | RoomType>("all");
  const [selectedRoom, setSelected] = useState<Room | null>(null);
  const [status, setStatus]         = useState<"loading" | "ok" | "error">("loading");
  const { t } = useLang();

  // Use publicSupabase so RLS "USING(true)" works without needing auth token
  const fetchRooms = useCallback(async () => {
    setStatus("loading");
    const { data, error } = await publicSupabase
      .from("rooms").select("*").order("created_at");
    if (error) {
      console.error("[Rooms] fetch failed:", error.code, error.message);
      setStatus("error"); return;
    }
    setRooms(data ?? []);
    setStatus("ok");
  }, []);

  useEffect(() => {
    let active = true;
    fetchRooms();

    // Realtime via authed client
    const ch = supabase.channel("rooms-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => {
        if (active) fetchRooms();
      }).subscribe();

    const iv = setInterval(() => { if (active) fetchRooms(); }, 6000);
    const onFocus = () => { if (active) fetchRooms(); };
    const onSync  = (e: StorageEvent) => { if (e.key === "fg-last-room-sync" && active) fetchRooms(); };

    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onSync);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && active) fetchRooms(); });

    return () => {
      active = false; clearInterval(iv);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onSync);
      supabase.removeChannel(ch);
    };
  }, [fetchRooms]);

  const filtered = filter === "all" ? rooms : rooms.filter(r => r.type === filter);
  const avail    = rooms.filter(r => !r.occupied).length;
  const occ      = rooms.filter(r =>  r.occupied).length;

  const getRoomImage = (room: Room, idx: number) =>
    room.images?.[idx] ?? fallbackImages[idx % fallbackImages.length];

  const filterLabels: Record<string, string> = {
    all: t.allRooms, single: t.singleRoom, studio: t.studio, apartment: t.apartment,
  };

  return (
    <section id="rooms" className="py-20 bg-secondary">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
            {t.ourRooms} <span className="text-primary">{t.roomsHighlight}</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto font-body">{t.roomsDesc}</p>

          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {[{icon:Snowflake,label:t.ac},{icon:Tv,label:t.tv},{icon:Droplets,label:t.hotWater},{icon:Fuel,label:t.gas},{icon:Shield,label:t.security247}].map(s => (
              <span key={s.label} className="flex items-center gap-1.5 bg-card px-3 py-1.5 rounded-full text-xs font-medium border border-border text-muted-foreground">
                <s.icon size={12} className="text-primary" /> {s.label}
              </span>
            ))}
          </div>

          {status === "ok" && (
            <div className="flex justify-center gap-6 mt-6 text-sm font-semibold">
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-available animate-pulse" /> {avail} {t.available}</span>
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-occupied" /> {occ} {t.occupied}</span>
            </div>
          )}
        </motion.div>

        {/* Filter tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {(["all","single","studio","apartment"] as const).map(f => (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} key={f} onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${filter===f ? "gradient-primary text-primary-foreground shadow-warm" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}>
              {filterLabels[f]}
            </motion.button>
          ))}
        </div>

        {/* States */}
        {status === "loading" && (
          <div className="flex flex-col items-center py-20 gap-3 text-muted-foreground">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="text-sm">Loading rooms…</p>
          </div>
        )}
        {status === "error" && (
          <div className="flex flex-col items-center py-20 gap-4">
            <AlertCircle size={32} className="text-destructive" />
            <p className="text-sm text-muted-foreground">Could not load rooms. Check your connection.</p>
            <button onClick={fetchRooms} className="flex items-center gap-2 text-sm text-primary border border-primary/30 px-4 py-2 rounded-full hover:bg-primary/10 transition">
              <RefreshCw size={14} /> Try again
            </button>
          </div>
        )}

        {/* Grid */}
        {status === "ok" && (
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={{ hidden:{}, show:{ transition:{ staggerChildren:0.06 } } }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.length === 0
              ? <p className="col-span-full text-center text-muted-foreground py-12">No rooms for this filter.</p>
              : filtered.map(room => (
                <motion.div key={room.id} layout
                  variants={{ hidden:{opacity:0,y:30,scale:0.95}, show:{opacity:1,y:0,scale:1,transition:{type:"spring",damping:20,stiffness:200}} }}
                  className="bg-card rounded-2xl overflow-hidden shadow-card border border-border group hover:shadow-warm transition-all duration-300">
                  <div className="relative h-48 overflow-hidden cursor-pointer" onClick={() => setSelected(room)}>
                    <img src={getRoomImage(room,0)} alt={room.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold ${room.occupied?"bg-occupied text-occupied-foreground":"bg-available text-available-foreground"}`}>
                      {room.occupied ? t.occupied : t.available}
                    </div>
                    <div className="absolute top-3 left-3 bg-foreground/70 text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
                      {getRoomTypeLabel(room.type as any)}
                    </div>
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-all flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary-foreground/90 text-foreground px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5">
                        <Eye size={14} /> {t.viewDetails}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-display text-lg font-bold text-foreground">{room.name}</h3>
                      <span className="text-primary font-bold text-sm">{formatPrice(room.price)}/{t.night}</span>
                    </div>
                    <p className="text-muted-foreground text-xs mb-3 line-clamp-2">{room.description}</p>
                    {!room.occupied && (
                      <a href="#reservation" className="block w-full py-2 rounded-lg text-xs font-semibold text-center gradient-primary text-primary-foreground shadow-warm hover:opacity-90 transition">
                        {t.bookNow}
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
          </motion.div>
        )}
      </div>
      <RoomDetailModal room={selectedRoom} onClose={() => setSelected(null)} />
    </section>
  );
};
export default RoomsSection;
