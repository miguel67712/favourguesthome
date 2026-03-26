import room1 from "@/assets/room1.png";
import room2 from "@/assets/room2.png";
import room3 from "@/assets/room3.png";
import room4 from "@/assets/room4.png";

export type RoomType = "single" | "studio" | "apartment";

export interface Room {
  id: number;
  name: string;
  type: RoomType;
  price: number;
  occupied: boolean;
  images: string[];
  description: string;
  amenities: string[];
}

export const defaultRooms: Room[] = [
  { id: 1, name: "Room 1", type: "single", price: 10000, occupied: false, images: [room1, room2], description: "Cozy single room with modern amenities, AC, and private bathroom.", amenities: ["AC", "WiFi", "Private Bathroom", "TV"] },
  { id: 2, name: "Room 2", type: "single", price: 10000, occupied: true, images: [room2, room3], description: "Comfortable single room with natural light and elegant decor.", amenities: ["AC", "WiFi", "Private Bathroom"] },
  { id: 3, name: "Room 3", type: "single", price: 10000, occupied: false, images: [room3, room4], description: "Stylish single room with wooden ceiling and chandelier.", amenities: ["AC", "WiFi", "Private Bathroom", "TV"] },
  { id: 4, name: "Room 4", type: "single", price: 10000, occupied: true, images: [room4, room1], description: "Well-furnished single room with modern kitchen access.", amenities: ["AC", "WiFi", "Kitchen Access"] },
  { id: 5, name: "Room 5", type: "single", price: 10000, occupied: false, images: [room1, room3], description: "Peaceful single room perfect for relaxation.", amenities: ["AC", "WiFi", "Private Bathroom"] },
  { id: 6, name: "Room 6", type: "single", price: 10000, occupied: false, images: [room2, room4], description: "Bright single room with city view.", amenities: ["AC", "WiFi", "City View"] },
  { id: 7, name: "Room 7", type: "single", price: 10000, occupied: true, images: [room3, room1], description: "Elegant single room with premium furnishing.", amenities: ["AC", "WiFi", "Private Bathroom", "TV"] },
  { id: 8, name: "Room 8", type: "single", price: 10000, occupied: false, images: [room4, room2], description: "Modern single room with workspace.", amenities: ["AC", "WiFi", "Workspace", "Private Bathroom"] },
  { id: 9, name: "Room 9", type: "single", price: 10000, occupied: false, images: [room1, room4], description: "Quiet single room with garden view.", amenities: ["AC", "WiFi", "Garden View"] },
  { id: 10, name: "Studio 1", type: "studio", price: 15000, occupied: false, images: [room2, room3, room4], description: "Spacious studio with living area and kitchenette.", amenities: ["AC", "WiFi", "Kitchenette", "Living Area", "TV"] },
  { id: 11, name: "Studio 2", type: "studio", price: 15000, occupied: true, images: [room3, room1, room2], description: "Premium studio with modern appliances and separate lounge.", amenities: ["AC", "WiFi", "Full Kitchen", "Lounge", "TV", "Washing Machine"] },
  { id: 12, name: "Apartment", type: "apartment", price: 25000, occupied: false, images: [room4, room1, room2, room3], description: "Luxury apartment with full kitchen, living room, and bedroom. Perfect for families or long stays.", amenities: ["AC", "WiFi", "Full Kitchen", "Living Room", "TV", "Washing Machine", "Parking", "Balcony"] },
];

export function getRoomTypeLabel(type: RoomType): string {
  return type === "single" ? "Single Room" : type === "studio" ? "Studio" : "Apartment";
}

export function formatPrice(price: number): string {
  return `${price.toLocaleString()} XAF`;
}
