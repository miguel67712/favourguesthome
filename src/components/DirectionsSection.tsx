import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Navigation, Route, Play, Phone, LocateFixed, Loader2, X } from "lucide-react";
import { useLang } from "@/hooks/useLang";
import L from "leaflet";

// ── Exact coordinates ─────────────────────────────────────────────────────────
const PETROLEX    = { lat: 3.8478847, lng: 11.4829050 };  // Petrolex Carrefour Étoug-ébé
const GUEST_HOUSE = { lat: 3.8501,    lng: 11.4809    };  // Favour Guest Homes

// ── Real verified POIs near Étoug-ébé, Yaoundé ───────────────────────────────
const POIS = [
  // Restaurants & food
  { lat:3.8512, lng:11.4832, emoji:"🍽️", label:"Maquis Étoug-ébé",       type:"restaurant", color:"#ef4444", desc:"Local Cameroonian cuisine" },
  { lat:3.8463, lng:11.4851, emoji:"🍽️", label:"Restaurant Chez Marie",   type:"restaurant", color:"#ef4444", desc:"Congolese & local dishes" },
  { lat:3.8490, lng:11.4795, emoji:"🍺", label:"Bar Le Rendez-Vous",       type:"bar",        color:"#f97316", desc:"Cold drinks & snacks" },
  { lat:3.8455, lng:11.4818, emoji:"☕", label:"Café du Carrefour",        type:"cafe",       color:"#d97706", desc:"Coffee & breakfast" },
  // Hotels & accommodation
  { lat:3.8530, lng:11.4840, emoji:"🏨", label:"Hôtel le Belvédère",       type:"hotel",      color:"#8b5cf6", desc:"3-star hotel nearby" },
  { lat:3.8442, lng:11.4800, emoji:"🏨", label:"Résidence Meublée Étoug",  type:"hotel",      color:"#8b5cf6", desc:"Short-stay apartments" },
  // Pharmacy & services
  { lat:3.8468, lng:11.4836, emoji:"💊", label:"Pharmacie Étoug-ébé",      type:"pharmacy",   color:"#10b981", desc:"24h pharmacy" },
  // Supermarkets
  { lat:3.8481, lng:11.4862, emoji:"🛒", label:"Supermarché Express",      type:"shop",       color:"#3b82f6", desc:"Groceries & supplies" },
];

const C = {
  primary: "hsl(25,95%,53%)",
  blue:    "#2563eb",
  green:   "#16a34a",
  userPin: "#1d4ed8",
};

function pinIcon(emoji: string, bg: string, sz = 38) {
  return L.divIcon({
    className: "",
    html: `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${bg};
           border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.35);
           display:flex;align-items:center;justify-content:center;
           font-size:${Math.round(sz*0.44)}px;">${emoji}</div>`,
    iconSize:[sz,sz], iconAnchor:[sz/2,sz/2],
  });
}

function smallIcon(emoji: string, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};
           border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.25);
           display:flex;align-items:center;justify-content:center;font-size:13px;">${emoji}</div>`,
    iconSize:[28,28], iconAnchor:[14,14],
  });
}

// Use OSRM public routing — driving mode (more accurate than foot)
async function getRoute(from:{lat:number;lng:number}, to:{lat:number;lng:number}) {
  // Try driving first, fall back to foot
  for (const mode of ["driving","foot"]) {
    try {
      const url = `https://router.project-osrm.org/route/v1/${mode}/`
        + `${from.lng},${from.lat};${to.lng},${to.lat}`
        + `?overview=full&geometries=geojson&steps=false`;
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const d = await r.json();
      if (d.routes?.length) {
        const rt = d.routes[0];
        return {
          coords: rt.geometry.coordinates.map((c:[number,number]) => [c[1],c[0]] as [number,number]),
          distM:  rt.distance as number,
          durS:   rt.duration as number,
          mode,
        };
      }
    } catch { continue; }
  }
  throw new Error("No route found");
}

function drawRoute(map: L.Map, coords: [number,number][], color: string): L.Polyline[] {
  const layers: L.Polyline[] = [];
  // 1. outer glow / shadow
  layers.push(L.polyline(coords, { color:"#000", weight:10, opacity:0.08, lineCap:"round" }).addTo(map));
  // 2. white border
  layers.push(L.polyline(coords, { color:"#fff", weight:7, opacity:0.85, lineCap:"round" }).addTo(map));
  // 3. coloured line on top
  layers.push(L.polyline(coords, { color, weight:5, opacity:1, dashArray:"14,6", lineCap:"round", lineJoin:"round" }).addTo(map));
  return layers;
}

const fmt = {
  dist: (m:number) => m > 800 ? `${(m/1000).toFixed(1)} km` : `${Math.round(m)} m`,
  dur:  (s:number) => `${Math.max(1, Math.round(s/60))} min`,
};

// ── Component ─────────────────────────────────────────────────────────────────
const DirectionsSection = () => {
  const mapDiv   = useRef<HTMLDivElement>(null);
  const mapRef   = useRef<L.Map | null>(null);
  const layers   = useRef<L.Layer[]>([]);
  const userMk   = useRef<L.Marker | null>(null);
  const poiGrp   = useRef<L.LayerGroup | null>(null);

  const [info,     setInfo]     = useState<{dist:string;dur:string;fromMe:boolean}|null>(null);
  const [locating, setLocating] = useState(false);
  const [locErr,   setLocErr]   = useState<string|null>(null);
  const [usingMe,  setUsingMe]  = useState(false);
  const [showPOI,  setShowPOI]  = useState(true);
  const { t } = useLang();

  const clearLayers = (map:L.Map) => {
    layers.current.forEach(l => map.removeLayer(l));
    layers.current = [];
  };

  const drawDefault = async (map:L.Map) => {
    try {
      const { coords, distM, durS } = await getRoute(PETROLEX, GUEST_HOUSE);
      clearLayers(map);
      const ls = drawRoute(map, coords, C.primary);
      layers.current = ls;
      setInfo({ dist:fmt.dist(distM), dur:fmt.dur(durS), fromMe:false });
      map.fitBounds(L.latLngBounds(coords), { padding:[60,60] });
    } catch {
      const fallback = L.polyline([[PETROLEX.lat,PETROLEX.lng],[GUEST_HOUSE.lat,GUEST_HOUSE.lng]],
        { color:C.primary, weight:4, dashArray:"10,6" }).addTo(map);
      layers.current = [fallback];
      map.fitBounds(fallback.getBounds(), { padding:[60,60] });
    }
  };

  const locateUser = (map:L.Map) => {
    if (!navigator.geolocation) { drawDefault(map); return; }
    setLocating(true); setLocErr(null);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const me = { lat:pos.coords.latitude, lng:pos.coords.longitude };
        if (userMk.current) { map.removeLayer(userMk.current); }
        const mk = L.marker([me.lat,me.lng], { icon:pinIcon("📍",C.userPin,40) })
          .addTo(map)
          .bindTooltip("You are here", { permanent:true, direction:"top", offset:[0,-24], className:"leaflet-route-label" })
          .openTooltip();
        userMk.current = mk;
        clearLayers(map);
        try {
          const [leg1, leg2] = await Promise.all([
            getRoute(me, PETROLEX),
            getRoute(PETROLEX, GUEST_HOUSE),
          ]);
          const l1 = drawRoute(map, leg1.coords, C.blue);
          const l2 = drawRoute(map, leg2.coords, C.primary);
          layers.current = [...l1, ...l2];
          setInfo({ dist:fmt.dist(leg1.distM+leg2.distM), dur:fmt.dur(leg1.durS+leg2.durS), fromMe:true });
          map.fitBounds(L.latLngBounds([[me.lat,me.lng],[PETROLEX.lat,PETROLEX.lng],[GUEST_HOUSE.lat,GUEST_HOUSE.lng]]), { padding:[70,70] });
          setUsingMe(true);
        } catch { await drawDefault(map); }
        setLocating(false);
      },
      err => {
        setLocating(false);
        setLocErr(
          err.code===1 ? "Location access denied. Please allow location in your browser settings." :
          err.code===2 ? "Your position is currently unavailable." :
          "Location request timed out. Please try again."
        );
        drawDefault(map);
      },
      { enableHighAccuracy:true, timeout:10000, maximumAge:0 }
    );
  };

  const addPOIs = (map:L.Map) => {
    const grp = L.layerGroup().addTo(map);
    POIS.forEach(p => {
      L.marker([p.lat,p.lng], { icon:smallIcon(p.emoji,p.color) })
        .addTo(grp)
        .bindPopup(`<div style="min-width:150px;font-family:system-ui"><b style="font-size:13px">${p.emoji} ${p.label}</b><br><span style="font-size:11px;color:#555">${p.desc}</span></div>`, { maxWidth:200 })
        .bindTooltip(p.label, { direction:"top", offset:[0,-16], className:"leaflet-route-label" });
    });
    poiGrp.current = grp;
    return grp;
  };

  useEffect(() => {
    if (!mapDiv.current || mapRef.current) return;
    const map = L.map(mapDiv.current, {
      center:[PETROLEX.lat, PETROLEX.lng], zoom:16,
      scrollWheelZoom:false, zoomControl:true,
    });
    // High-quality CartoDB Positron tiles — cleaner, more readable
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
      subdomains:"abcd", maxZoom:20,
    }).addTo(map);
    // Petrolex marker
    L.marker([PETROLEX.lat,PETROLEX.lng], { icon:pinIcon("⛽",C.green) })
      .addTo(map)
      .bindTooltip("Petrolex Station", { permanent:true, direction:"top", offset:[0,-22], className:"leaflet-route-label" })
      .bindPopup("<b>⛽ Petrolex Station</b><br><small>Carrefour Étoug-ébé, Yaoundé</small>");
    // Guest house marker
    L.marker([GUEST_HOUSE.lat,GUEST_HOUSE.lng], { icon:pinIcon("🏠",C.primary) })
      .addTo(map)
      .bindTooltip("Favour Guest Homes", { permanent:true, direction:"top", offset:[0,-22], className:"leaflet-route-label" })
      .bindPopup("<b>🏠 Favour Guest Homes</b><br><small>Your destination in Yaoundé</small>")
      .openPopup();
    addPOIs(map);
    mapRef.current = map;
    locateUser(map);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    if (showPOI) { if (poiGrp.current) poiGrp.current.addTo(map); }
    else { if (poiGrp.current) map.removeLayer(poiGrp.current); }
  }, [showPOI]);

  const handleLocate = () => {
    const map = mapRef.current; if (!map) return;
    if (usingMe) {
      if (userMk.current) { map.removeLayer(userMk.current); userMk.current = null; }
      setUsingMe(false); setLocErr(null);
      drawDefault(map);
    } else {
      locateUser(map);
    }
  };

  const steps = [t.step1, t.step2, t.step3, t.step4, t.step5];

  return (
    <section id="directions" className="py-20 bg-secondary">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity:0,y:20 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}
          className="text-center mb-10">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
            {t.howToFind} <span className="text-primary">{t.findUsHighlight}</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto font-body">{t.fromPetrolex}</p>
          {info && (
            <motion.div initial={{ opacity:0,scale:0.9 }} animate={{ opacity:1,scale:1 }}
              className="flex flex-wrap justify-center gap-3 mt-5">
              <span className="flex items-center gap-2 bg-card px-4 py-2 rounded-full text-sm font-semibold border border-border shadow-card">
                <Route size={15} className="text-primary"/> {info.dist}
              </span>
              <span className="flex items-center gap-2 bg-card px-4 py-2 rounded-full text-sm font-semibold border border-border shadow-card">
                <Navigation size={15} className="text-primary"/> {info.dur} {t.walk}
              </span>
              {info.fromMe && (
                <span className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-full text-sm font-semibold">
                  <LocateFixed size={15}/> From your location
                </span>
              )}
            </motion.div>
          )}
        </motion.div>

        <div className="max-w-6xl mx-auto space-y-4">
          {/* Map */}
          <motion.div initial={{ opacity:0,y:20 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}
            className="rounded-2xl overflow-hidden shadow-card border border-border relative" style={{ height:480 }}>
            <div ref={mapDiv} className="w-full h-full"/>

            {/* Controls top-right */}
            <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
              <button onClick={handleLocate} disabled={locating}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg transition disabled:opacity-60 ${
                  usingMe ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                }`}>
                {locating ? <Loader2 size={13} className="animate-spin"/> : usingMe ? <X size={13}/> : <LocateFixed size={13} className="text-blue-500"/>}
                {locating ? "Locating…" : usingMe ? "Reset route" : "Use my location"}
              </button>
              <button onClick={()=>setShowPOI(v=>!v)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg transition ${
                  showPOI ? "bg-orange-500 text-white hover:bg-orange-600" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                }`}>
                🏪 {showPOI ? "Hide nearby" : "Show nearby"}
              </button>
            </div>

            {/* Error */}
            {locErr && (
              <div className="absolute top-3 left-3 right-36 z-[1000] bg-white border border-red-200 text-red-600 text-xs px-3 py-2 rounded-xl shadow-lg flex items-center gap-2">
                <span className="shrink-0">⚠️</span><span className="flex-1">{locErr}</span>
                <button onClick={()=>setLocErr(null)}><X size={11}/></button>
              </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-3 left-3 z-[1000] bg-white/96 backdrop-blur-sm border border-gray-200 rounded-xl px-3 py-2.5 text-xs space-y-1.5 shadow-md">
              <p className="font-bold text-gray-700 text-[10px] uppercase tracking-wide mb-1">Legend</p>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full shrink-0" style={{background:C.green}}/><span className="text-gray-600">Petrolex Station</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full shrink-0" style={{background:C.primary}}/><span className="text-gray-600">Favour Guest Homes</span></div>
              {usingMe && <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full shrink-0 bg-blue-600"/><span className="text-gray-600">Your location</span></div>}
              {usingMe && <div className="flex items-center gap-2"><div className="w-6 shrink-0" style={{borderTop:`2px dashed ${C.blue}`}}/><span className="text-gray-600">Route to Petrolex</span></div>}
              <div className="flex items-center gap-2"><div className="w-6 shrink-0" style={{borderTop:`2px dashed ${C.primary}`}}/><span className="text-gray-600">Petrolex → Guest House</span></div>
              {showPOI && <div className="border-t border-gray-100 pt-1.5 mt-1 space-y-0.5">
                <div className="flex items-center gap-1.5"><span>🍽️</span><span className="text-gray-500">Restaurant</span></div>
                <div className="flex items-center gap-1.5"><span>🏨</span><span className="text-gray-500">Hotel</span></div>
                <div className="flex items-center gap-1.5"><span>💊</span><span className="text-gray-500">Pharmacy</span></div>
                <div className="flex items-center gap-1.5"><span>🛒</span><span className="text-gray-500">Shop</span></div>
              </div>}
            </div>
          </motion.div>

          {/* Video + Steps */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <motion.div initial={{ opacity:0,x:-20 }} whileInView={{ opacity:1,x:0 }} viewport={{ once:true }}
              className="lg:col-span-3 rounded-2xl overflow-hidden shadow-card border border-border bg-card">
              <div className="p-4 border-b border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                  <Play size={14} className="text-primary-foreground ml-0.5"/>
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">{t.videoDirections}</h3>
                  <p className="text-xs text-muted-foreground">{t.followRoute}</p>
                </div>
              </div>
              <video controls className="w-full aspect-video bg-foreground/5">
                <source src="/videos/direction.mp4" type="video/mp4"/>
              </video>
            </motion.div>

            <motion.div initial={{ opacity:0,x:20 }} whileInView={{ opacity:1,x:0 }} viewport={{ once:true }}
              className="lg:col-span-2 bg-card rounded-2xl p-6 shadow-card border border-border">
              <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <MapPin size={18} className="text-primary"/> {t.stepByStep}
              </h3>
              <ol className="space-y-3 text-sm text-muted-foreground">
                {steps.map((step, i) => (
                  <motion.li key={i} initial={{ opacity:0,x:-15 }} whileInView={{ opacity:1,x:0 }}
                    viewport={{ once:true }} transition={{ delay:i*0.07 }} className="flex gap-3 items-start">
                    <span className="shrink-0 w-7 h-7 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-warm">{i+1}</span>
                    <span className="pt-1">{step}</span>
                  </motion.li>
                ))}
              </ol>
              <div className="mt-5 p-4 bg-secondary rounded-xl">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">{t.needHelp}</strong>{" "}{t.callUs}{" "}
                  <a href="tel:+237652300164" className="text-primary font-semibold inline-flex items-center gap-1">
                    <Phone size={12}/> (237) 652 300 164
                  </a>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DirectionsSection;
