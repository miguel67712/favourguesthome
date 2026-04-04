import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin, Navigation, Route, Play, Phone,
  LocateFixed, Loader2, X, Utensils, Building2, Coffee,
} from "lucide-react";
import { useLang } from "@/hooks/useLang";
import L from "leaflet";

// ── Key coordinates ───────────────────────────────────────────────────────────
const PETROLEX    = { lat: 3.8478847, lng: 11.4829050 };
const GUEST_HOUSE = { lat: 3.8501,    lng: 11.4809    };

// ── Nearby POIs (hotels & restaurants near Étoug-ébé) ────────────────────────
const POIS = [
  { lat: 3.8492, lng: 11.4825, emoji: "🍽️", label: "Restaurant Étougébé", type: "restaurant", color: "#ef4444", desc: "Local cuisine & grills" },
  { lat: 3.8465, lng: 11.4798, emoji: "🍺", label: "Bar Chez Paul",        type: "restaurant", color: "#ef4444", desc: "Drinks & snacks" },
  { lat: 3.8510, lng: 11.4835, emoji: "🏨", label: "Hotel Mfoundi",        type: "hotel",      color: "#8b5cf6", desc: "Nearby guesthouse" },
  { lat: 3.8456, lng: 11.4812, emoji: "☕", label: "Café Express",         type: "cafe",       color: "#d97706", desc: "Coffee & pastries" },
  { lat: 3.8488, lng: 11.4795, emoji: "🍽️", label: "Maquis du Carrefour", type: "restaurant", color: "#ef4444", desc: "Traditional Cameroon food" },
  { lat: 3.8520, lng: 11.4800, emoji: "🏨", label: "Résidence Les Pins",   type: "hotel",      color: "#8b5cf6", desc: "Short-stay apartments" },
];

// ── Colours ───────────────────────────────────────────────────────────────────
const C = {
  primary: "hsl(25,95%,53%)",
  blue:    "#3b82f6",
  green:   "#22c55e",
  shadow:  "0 3px 12px rgba(0,0,0,.30)",
};

// ── Icon factory ──────────────────────────────────────────────────────────────
function pinIcon(emoji: string, bg: string, sz = 36) {
  return L.divIcon({
    className: "",
    html: `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${bg};
           border:3px solid #fff;box-shadow:${C.shadow};display:flex;align-items:center;
           justify-content:center;font-size:${Math.round(sz * 0.44)}px;">${emoji}</div>`,
    iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2],
  });
}

function poiIcon(emoji: string, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};
           border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25);
           display:flex;align-items:center;justify-content:center;font-size:14px;">${emoji}</div>`,
    iconSize: [30, 30], iconAnchor: [15, 15],
  });
}

// ── Route fetcher ─────────────────────────────────────────────────────────────
async function fetchRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const url = `https://router.project-osrm.org/route/v1/foot/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url, { signal: AbortSignal.timeout(9000) });
  const d   = await res.json();
  if (!d.routes?.length) throw new Error("No route");
  const r = d.routes[0];
  return {
    coords: r.geometry.coordinates.map((c: [number,number]) => [c[1], c[0]] as [number,number]),
    distM:  r.distance as number,
    durS:   r.duration as number,
  };
}

const fmt = {
  dist: (m: number) => m > 800 ? `${(m/1000).toFixed(1)} km` : `${Math.round(m)} m`,
  dur:  (s: number) => `${Math.max(1, Math.round(s/60))} min`,
};

// ── Component ─────────────────────────────────────────────────────────────────
const DirectionsSection = () => {
  const mapDiv   = useRef<HTMLDivElement>(null);
  const mapRef   = useRef<L.Map | null>(null);
  const linesRef = useRef<L.Polyline[]>([]);
  const userMk   = useRef<L.Marker | null>(null);
  const poiGroup = useRef<L.LayerGroup | null>(null);

  const [info,     setInfo]     = useState<{ dist: string; dur: string; fromMe: boolean } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locErr,   setLocErr]   = useState<string | null>(null);
  const [usingMe,  setUsingMe]  = useState(false);
  const [showPOIs, setShowPOIs] = useState(true);
  const { t } = useLang();

  // ── helpers ─────────────────────────────────────────────────────────────────
  const clearLines = (map: L.Map) => {
    linesRef.current.forEach(l => map.removeLayer(l));
    linesRef.current = [];
  };

  const drawAnimatedLine = (
    map: L.Map,
    coords: [number, number][],
    color: string,
    dash = "12,8"
  ): L.Polyline => {
    // Shadow / outline line for depth
    L.polyline(coords, { color: "#000", weight: 9, opacity: 0.12 }).addTo(map);
    // Solid white underline
    L.polyline(coords, { color: "#fff", weight: 7, opacity: 0.7 }).addTo(map);
    // Main coloured dashed line
    const line = L.polyline(coords, {
      color, weight: 5, opacity: 0.95,
      dashArray: dash, lineCap: "round", lineJoin: "round",
    }).addTo(map);
    return line;
  };

  const drawDefault = async (map: L.Map) => {
    try {
      const { coords, distM, durS } = await fetchRoute(PETROLEX, GUEST_HOUSE);
      clearLines(map);
      const line = drawAnimatedLine(map, coords, C.primary);
      linesRef.current = [line];
      setInfo({ dist: fmt.dist(distM), dur: fmt.dur(durS), fromMe: false });
      map.fitBounds(L.latLngBounds(coords), { padding: [70, 70] });
    } catch {
      const line = L.polyline(
        [[PETROLEX.lat, PETROLEX.lng], [GUEST_HOUSE.lat, GUEST_HOUSE.lng]],
        { color: C.primary, weight: 4, dashArray: "8,6" }
      ).addTo(map);
      linesRef.current = [line];
      map.fitBounds(line.getBounds(), { padding: [70, 70] });
    }
  };

  // ── Locate user & draw full route ──────────────────────────────────────────
  const locateUser = (map: L.Map) => {
    if (!navigator.geolocation) { drawDefault(map); return; }
    setLocating(true);
    setLocErr(null);

    navigator.geolocation.getCurrentPosition(
      async pos => {
        const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        // Remove old user marker
        if (userMk.current) { map.removeLayer(userMk.current); }
        const mk = L.marker([me.lat, me.lng], { icon: pinIcon("📍", C.blue, 40) })
          .addTo(map)
          .bindTooltip("You are here", { permanent: true, direction: "top", offset: [0, -24], className: "leaflet-route-label" })
          .openTooltip();
        userMk.current = mk;

        clearLines(map);
        try {
          const [leg1, leg2] = await Promise.all([
            fetchRoute(me, PETROLEX),
            fetchRoute(PETROLEX, GUEST_HOUSE),
          ]);

          // Leg 1: you → Petrolex (blue)
          drawAnimatedLine(map, leg1.coords, C.blue);
          // Leg 2: Petrolex → Guest House (orange)
          const l2 = drawAnimatedLine(map, leg2.coords, C.primary);
          linesRef.current = [l2]; // track for clearing

          // Arrow markers at Petrolex showing direction change
          const midPetrIdx = Math.floor(leg1.coords.length / 2);
          if (midPetrIdx < leg1.coords.length) {
            L.circleMarker(leg1.coords[midPetrIdx], {
              radius: 6, color: C.blue, fillColor: "#fff", fillOpacity: 1, weight: 2,
            }).addTo(map).bindTooltip("Head to Petrolex", { direction: "top", className: "leaflet-route-label" });
          }

          setInfo({
            dist: fmt.dist(leg1.distM + leg2.distM),
            dur:  fmt.dur(leg1.durS  + leg2.durS),
            fromMe: true,
          });

          map.fitBounds(
            L.latLngBounds([[me.lat, me.lng], [PETROLEX.lat, PETROLEX.lng], [GUEST_HOUSE.lat, GUEST_HOUSE.lng]]),
            { padding: [70, 70] }
          );
          setUsingMe(true);
        } catch {
          drawDefault(map);
        }
        setLocating(false);
      },
      err => {
        setLocating(false);
        const msg =
          err.code === 1 ? "Location access denied. Please allow location in your browser." :
          err.code === 2 ? "Your location is unavailable right now." :
          "Location request timed out.";
        setLocErr(msg);
        drawDefault(map);
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 30000 }
    );
  };

  // ── Add POI markers ───────────────────────────────────────────────────────
  const addPOIs = (map: L.Map) => {
    const group = L.layerGroup().addTo(map);
    POIS.forEach(poi => {
      L.marker([poi.lat, poi.lng], { icon: poiIcon(poi.emoji, poi.color) })
        .addTo(group)
        .bindPopup(
          `<div style="min-width:140px">
            <b style="font-size:13px">${poi.emoji} ${poi.label}</b><br>
            <span style="font-size:11px;color:#666">${poi.desc}</span>
          </div>`,
          { maxWidth: 180 }
        )
        .bindTooltip(poi.label, { direction: "top", offset: [0, -18], className: "leaflet-route-label" });
    });
    poiGroup.current = group;
    return group;
  };

  // ── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapDiv.current || mapRef.current) return;

    const map = L.map(mapDiv.current, {
      center: [PETROLEX.lat, PETROLEX.lng],
      zoom: 16,
      scrollWheelZoom: false,
      zoomControl: true,
    });

    // Clean bright OSM tiles
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Petrolex marker
    L.marker([PETROLEX.lat, PETROLEX.lng], { icon: pinIcon("⛽", C.green) })
      .addTo(map)
      .bindTooltip("Petrolex Station", { permanent: true, direction: "top", offset: [0, -24], className: "leaflet-route-label" })
      .bindPopup("<b>⛽ Petrolex Station</b><br><small>Carrefour Étoug-ébé, Yaoundé</small>");

    // Guest House marker
    L.marker([GUEST_HOUSE.lat, GUEST_HOUSE.lng], { icon: pinIcon("🏠", C.primary) })
      .addTo(map)
      .bindTooltip("Favour Guest Homes", { permanent: true, direction: "top", offset: [0, -24], className: "leaflet-route-label" })
      .bindPopup("<b>🏠 Favour Guest Homes</b><br><small>Your destination</small>")
      .openPopup();

    // POIs
    addPOIs(map);

    mapRef.current = map;

    // Auto-locate user immediately
    locateUser(map);

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ── Toggle POIs ───────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (showPOIs) {
      if (!poiGroup.current) { addPOIs(map); }
      else poiGroup.current.addTo(map);
    } else {
      if (poiGroup.current) map.removeLayer(poiGroup.current);
    }
  }, [showPOIs]);

  const handleLocate = () => {
    const map = mapRef.current; if (!map) return;
    if (usingMe) {
      // Reset
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
        {/* Heading */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-10">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
            {t.howToFind} <span className="text-primary">{t.findUsHighlight}</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto font-body">{t.fromPetrolex}</p>

          {/* Route info badges */}
          {info && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
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

        <div className="max-w-6xl mx-auto space-y-6">
          {/* ── MAP ─────────────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="rounded-2xl overflow-hidden shadow-card border border-border relative"
            style={{ height: 480 }}>

            <div ref={mapDiv} className="w-full h-full"/>

            {/* Top controls */}
            <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
              {/* Locate / reset */}
              <button
                onClick={handleLocate}
                disabled={locating}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg transition disabled:opacity-60 ${
                  usingMe
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {locating
                  ? <Loader2 size={13} className="animate-spin"/>
                  : usingMe ? <X size={13}/> : <LocateFixed size={13} className="text-blue-500"/>
                }
                {locating ? "Locating…" : usingMe ? "Reset route" : "Use my location"}
              </button>

              {/* Toggle POIs */}
              <button
                onClick={() => setShowPOIs(v => !v)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg transition ${
                  showPOIs
                    ? "bg-amber-500 text-white hover:bg-amber-600"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Utensils size={13}/>
                {showPOIs ? "Hide nearby" : "Show nearby"}
              </button>
            </div>

            {/* Error banner */}
            {locErr && (
              <div className="absolute top-3 left-3 right-32 z-[1000] bg-white border border-red-200 text-red-600 text-xs px-3 py-2 rounded-xl shadow-lg flex items-center gap-2">
                <span className="shrink-0">⚠️</span>
                <span className="flex-1">{locErr}</span>
                <button onClick={() => setLocErr(null)}><X size={11}/></button>
              </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl px-3 py-2.5 text-xs space-y-1.5 shadow-md">
              <p className="font-bold text-gray-700 mb-1.5 text-[11px] uppercase tracking-wide">Map Legend</p>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ background: C.green }}/>
                <span className="text-gray-600">Petrolex Station (start)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ background: C.primary }}/>
                <span className="text-gray-600">Favour Guest Homes</span>
              </div>
              {usingMe && (
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full inline-block flex-shrink-0 bg-blue-500"/>
                  <span className="text-gray-600">Your location</span>
                </div>
              )}
              {usingMe && (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 inline-block flex-shrink-0" style={{ background: C.blue, borderTop: "2px dashed " + C.blue }}/>
                  <span className="text-gray-600">Your route to Petrolex</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 inline-block flex-shrink-0" style={{ borderTop: "2px dashed " + C.primary }}/>
                <span className="text-gray-600">Petrolex → Guest House</span>
              </div>
              {showPOIs && (
                <>
                  <div className="border-t border-gray-100 pt-1.5 mt-1.5">
                    <div className="flex items-center gap-2"><span>🍽️</span><span className="text-gray-600">Restaurant</span></div>
                    <div className="flex items-center gap-2 mt-0.5"><span>🏨</span><span className="text-gray-600">Hotel / Accommodation</span></div>
                    <div className="flex items-center gap-2 mt-0.5"><span>☕</span><span className="text-gray-600">Café</span></div>
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* POI chips below map */}
          {showPOIs && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-2 justify-center">
              {POIS.map(poi => (
                <span key={poi.label}
                  className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
                  <span>{poi.emoji}</span> {poi.label}
                </span>
              ))}
            </motion.div>
          )}

          {/* Video + Steps */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
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

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="lg:col-span-2 bg-card rounded-2xl p-6 shadow-card border border-border">
              <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <MapPin size={18} className="text-primary"/> {t.stepByStep}
              </h3>
              <ol className="space-y-3 text-sm text-muted-foreground font-body">
                {steps.map((step, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.07 }} className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-warm shrink-0">
                      {i + 1}
                    </span>
                    <span className="pt-1">{step}</span>
                  </motion.li>
                ))}
              </ol>
              <div className="mt-6 p-4 bg-secondary rounded-xl">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">{t.needHelp}</strong>{" "}{t.callUs}{" "}
                  <a href="tel:+237652300164" className="text-primary font-semibold inline-flex items-center gap-1">
                    <Phone size={12}/> (237) 652 300 164
                  </a>
                </p>
              </div>

              {/* Nearby quick-list */}
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                  <Building2 size={13} className="text-primary"/> Nearby Places
                </p>
                <div className="space-y-1.5">
                  {POIS.slice(0, 4).map(p => (
                    <div key={p.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{p.emoji}</span>
                      <span className="font-medium text-foreground">{p.label}</span>
                      <span className="ml-auto text-[10px] opacity-60">{p.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DirectionsSection;
