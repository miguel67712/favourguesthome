import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Wifi,
  Snowflake,
  Tv,
  UtensilsCrossed,
  Car,
  Bath,
  Eye,
  Fuel,
  Shield,
  Droplets,
  Refrigerator,
} from "lucide-react";
import { getRoomTypeLabel, formatPrice } from "@/lib/roomsData";
import type { Tables } from "@/integrations/supabase/types";
import room1 from "@/assets/room1.png";
import room2 from "@/assets/room2.png";
import room3 from "@/assets/room3.png";
import room4 from "@/assets/room4.png";

type Room = Tables<"rooms">;

const fallbackImages = [room1, room2, room3, room4];

const amenityIcons: Record<string, React.ReactNode> = {
  WiFi: <Wifi size={14} />,
  AC: <Snowflake size={14} />,
  TV: <Tv size={14} />,
  "Kitchen Access": <UtensilsCrossed size={14} />,
  Kitchenette: <UtensilsCrossed size={14} />,
  "Full Kitchen": <UtensilsCrossed size={14} />,
  Parking: <Car size={14} />,
  "Private Bathroom": <Bath size={14} />,
  Gas: <Fuel size={14} />,
  Security: <Shield size={14} />,
  "24/7 Security": <Shield size={14} />,
  "Hot Water": <Droplets size={14} />,
  "Hot & Cold Water": <Droplets size={14} />,
  Fridge: <Refrigerator size={14} />,
};

interface Props {
  room: Room | null;
  onClose: () => void;
}

const RoomDetailModal = ({ room, onClose }: Props) => {
  const [currentImage, setCurrentImage] = useState(0);

  if (!room) return null;

  const images = room.images && room.images.length > 0 ? room.images : fallbackImages.slice(0, 2);
  const nextImage = () => setCurrentImage((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentImage((prev) => (prev - 1 + images.length) % images.length);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-card rounded-2xl overflow-hidden max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-card border border-border"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative h-64 md:h-80">
            <img src={images[currentImage]} alt={room.name} className="w-full h-full object-cover" />
            <button onClick={onClose} className="absolute top-3 right-3 bg-foreground/50 text-primary-foreground p-2 rounded-full backdrop-blur-sm hover:bg-foreground/70 transition">
              <X size={18} />
            </button>
            {images.length > 1 && (
              <>
                <button onClick={prevImage} className="absolute left-3 top-1/2 -translate-y-1/2 bg-foreground/50 text-primary-foreground p-2 rounded-full backdrop-blur-sm hover:bg-foreground/70 transition">
                  <ChevronLeft size={18} />
                </button>
                <button onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 bg-foreground/50 text-primary-foreground p-2 rounded-full backdrop-blur-sm hover:bg-foreground/70 transition">
                  <ChevronRight size={18} />
                </button>
              </>
            )}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, i) => (
                <button key={i} onClick={() => setCurrentImage(i)} className={`w-2.5 h-2.5 rounded-full transition ${i === currentImage ? "bg-primary scale-125" : "bg-primary-foreground/60"}`} />
              ))}
            </div>
            <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold ${room.occupied ? "bg-occupied text-occupied-foreground" : "bg-available text-available-foreground"}`}>
              {room.occupied ? "Occupied" : "Available"}
            </div>
          </div>

          <div className="p-6">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">{room.name}</h2>
                <span className="text-muted-foreground text-sm">{getRoomTypeLabel(room.type as any)}</span>
              </div>
              <span className="text-primary font-display text-xl font-bold">
                {formatPrice(room.price)}
                <span className="text-sm font-body text-muted-foreground">/night</span>
              </span>
            </div>

            <p className="text-muted-foreground font-body text-sm mt-4 mb-6">{room.description}</p>

            <h3 className="font-display text-lg font-bold text-foreground mb-3">Amenities & Services</h3>
            <div className="flex flex-wrap gap-2 mb-6">
              {room.amenities.map((a) => (
                <span key={a} className="flex items-center gap-1.5 bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full text-xs font-medium">
                  {amenityIcons[a] || <Eye size={14} />} {a}
                </span>
              ))}
            </div>

            {images.length > 1 && (
              <>
                <h3 className="font-display text-lg font-bold text-foreground mb-3">Gallery</h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, i) => (
                    <button key={i} onClick={() => setCurrentImage(i)} className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition ${i === currentImage ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"}`}>
                      <img src={img} alt={`${room.name} ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </>
            )}

            {!room.occupied && (
              <a href="#reservation" onClick={onClose} className="block mt-6 text-center gradient-primary text-primary-foreground py-3 rounded-xl font-semibold shadow-warm hover:opacity-90 transition text-lg">
                Book This Room
              </a>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RoomDetailModal;
