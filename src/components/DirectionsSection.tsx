import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Navigation, Route, Play, Phone, LocateFixed, Loader2, AlertCircle, X } from "lucide-react";
import { useLang } from "@/hooks/useLang";
import L from "leaflet";

// ── Constants ────────────────────────────────────────────────────────────────
const PETROLEX    = { lat: 3.8478847, lng: 11.4829050 };
const GUEST_HOUSE = { lat: 3.8501,    lng: 11.4809    };

const PRIMARY = "hsl(25,95%,53%)";
const BLUE    = "#3b82f6";
const GREEN   = "#22c55e";

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeIcon(emoji: string, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:36px;height:36px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:16px">${emoji}</div>`,
    iconSize: [36, 36], iconAnchor: [18, 18],
  });
}

async function getRoute(from: {lat:number;lng:number}, to: {lat:number;lng:number}) {
  const url = `https://router.project-osrm.org/route/v1/foot/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const d = await r.json();
  if (!d.routes?.length) throw new Error("No route");
  const route = d.routes[0];
  return {
    coords: route.geometry.coordinates.map((c:[number,number]) => [c[1],c[0]] as [number,number]),
    distM:  route.distance as number,
    durS:   route.duration as number,
  };
}

function fmtDist(m: number) { return m > 800 ? `${(m/1000).toFixed(1)} km` : `${Math.round(m)} m`; }
function fmtDur(s: number)  { return `${Math.max(1, Math.round(s/60))} min`; }

// ── Component ─────────────────────────────────────────────────────────────────
const DirectionsSection = () => {
  const mapDiv   = useRef<HTMLDivElement>(null);
  const mapRef   = useRef<L.Map | null>(null);
  const linesRef = useRef<L.Polyline[]>([]);
  const userMark = useRef<L.Marker | null>(null);

  const [info,      setInfo]      = useState<{dist:string;dur:string;fromMe:boolean}|null>(null);
  const [locating,  setLocating]  = useState(false);
  const [locErr,    setLocErr]    = useState<string|null>(null);
  const [usingMe,   setUsingMe]   = useState(false);
  const { t } = useLang();

  // ── Init map ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapDiv.current || mapRef.current) return;

    const map = L.map(mapDiv.current, {
      center: [PETROLEX.lat, PETROLEX.lng], zoom: 16,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: "abcd", maxZoom: 20,
    }).addTo(map);

    L.marker([PETROLEX.lat, PETROLEX.lng], { icon: makeIcon("⛽", GREEN) })
      .addTo(map)
      .bindTooltip("Petrolex Station", { permanent:true, direction:"top", offset:[0,-20], className:"leaflet-route-label" })
      .bindPopup("<b>Petrolex Station</b><br>Carrefour Étoug-ébé, Yaoundé");

    L.marker([GUEST_HOUSE.lat, GUEST_HOUSE.lng], { icon: makeIcon("🏠", PRIMARY) })
      .addTo(map)
      .bindTooltip("Favour Guest Homes", { permanent:true, direction:"top", offset:[0,-20], className:"leaflet-route-label" })
      .bindPopup("<b>Favour Guest Homes</b>")
      .openPopup();

    mapRef.current = map;

    // Default route: Petrolex → Guest House
    getRoute(PETROLEX, GUEST_HOUSE).then(({ coords, distM, durS }) => {
      const line = L.polyline(coords, { color:PRIMARY, weight:5, opacity:0.9, dashArray:"10,8" }).addTo(map);
      linesRef.current = [line];
      setInfo({ dist:fmtDist(distM), dur:fmtDur(durS), fromMe:false });
      map.fitBounds(line.getBounds(), { padding:[60,60] });
    }).catch(() => {
      const line = L.polyline([[PETROLEX.lat,PETROLEX.lng],[GUEST_HOUSE.lat,GUEST_HOUSE.lng]],
        { color:PRIMARY, weight:4, dashArray:"8,6" }).addTo(map);
      linesRef.current = [line];
      map.fitBounds(line.getBounds(), { padding:[60,60] });
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ── Clear drawn lines helper ───────────────────────────────────────────────
  const clearLines = () => {
    const map = mapRef.current!;
    linesRef.current.forEach(l => map.removeLayer(l));
    linesRef.current = [];
  };

  // ── Locate me ─────────────────────────────────────────────────────────────
  const locateMe = () => {
    if (!navigator.geolocation) { setLocErr("Geolocation not supported by your browser."); return; }
    setLocating(true); setLocErr(null);

    navigator.geolocation.getCurrentPosition(
      async pos => {
        const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const map = mapRef.current!;

        // Remove old user marker
        if (userMark.current) { map.removeLayer(userMark.current); userMark.current = null; }

        // Place user pin
        const um = L.marker([me.lat, me.lng], { icon: makeIcon("📍", BLUE) })
          .addTo(map)
          .bindTooltip("You are here", { permanent:true, direction:"top", offset:[0,-20], className:"leaflet-route-label" })
          .bindPopup("<b>Your Location</b>").openPopup();
        userMark.current = um;

        clearLines();

        try {
          // Leg 1: me → Petrolex (blue)
          const leg1 = await getRoute(me, PETROLEX);
          const l1 = L.polyline(leg1.coords, { color:BLUE,   weight:5, opacity:0.85, dashArray:"10,8" }).addTo(map);

          // Leg 2: Petrolex → Guest House (orange)
          const leg2 = await getRoute(PETROLEX, GUEST_HOUSE);
          const l2 = L.polyline(leg2.coords, { color:PRIMARY, weight:5, opacity:0.9,  dashArray:"10,8" }).addTo(map);

          linesRef.current = [l1, l2];

          const totalDist = leg1.distM + leg2.distM;
          const totalDur  = leg1.durS  + leg2.durS;
          setInfo({ dist:fmtDist(totalDist), dur:fmtDur(totalDur), fromMe:true });

          // Fit all 3 points
          map.fitBounds(L.latLngBounds([
            [me.lat, me.lng],
            [PETROLEX.lat, PETROLEX.lng],
            [GUEST_HOUSE.lat, GUEST_HOUSE.lng],
          ]), { padding:[60,60] });

          setUsingMe(true);
        } catch {
          setLocErr("Could not calculate route — showing your position only.");
          map.setView([me.lat, me.lng], 15);
        }
        setLocating(false);
      },
      err => {
        setLocating(false);
        if (err.code === 1) setLocErr("Location access denied. Please allow location in your browser settings.");
        else if (err.code === 2) setLocErr("Position unavailable. Try again.");
        else setLocErr("Location request timed out. Try again.");
      },
      { enableHighAccuracy:true, timeout:10000, maximumAge:0 }
    );
  };

  // ── Reset to default ───────────────────────────────────────────────────────
  const resetRoute = () => {
    const map = mapRef.current!;
    if (userMark.current) { map.removeLayer(userMark.current); userMark.current = null; }
    clearLines();
    setUsingMe(false); setLocErr(null);
    getRoute(PETROLEX, GUEST_HOUSE).then(({ coords, distM, durS }) => {
      const line = L.polyline(coords, { color:PRIMARY, weight:5, opacity:0.9, dashArray:"10,8" }).addTo(map);
      linesRef.current = [line];
      setInfo({ dist:fmtDist(distM), dur:fmtDur(durS), fromMe:false });
      map.fitBounds(line.getBounds(), { padding:[60,60] });
    }).catch(()=>{});
  };

  const steps = [t.step1, t.step2, t.step3, t.step4, t.step5];

  return (
    <section id="directions" className="py-20 bg-secondary">
      <div className="container mx-auto px-4">

        {/* Heading */}
        <motion.div initial={{ opacity:0,y:20 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }} className="text-center mb-10">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
            {t.howToFind} <span className="text-primary">{t.findUsHighlight}</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto font-body">{t.fromPetrolex}</p>

          {info && (
            <motion.div initial={{ opacity:0,scale:0.9 }} animate={{ opacity:1,scale:1 }} className="flex flex-wrap justify-center gap-3 mt-5">
              <span className="flex items-center gap-2 bg-card px-4 py-2 rounded-full text-sm font-semibold border border-border shadow-card">
                <Route size={15} className="text-primary"/> {info.dist}
              </span>
              <span className="flex items-center gap-2 bg-card px-4 py-2 rounded-full text-sm font-semibold border border-border shadow-card">
                <Navigation size={15} className="text-primary"/> {info.dur} {t.walk}
              </span>
              {info.fromMe && (
                <span className="flex items-center gap-2 bg-blue-100 text-blue-700 border border-blue-200 px-4 py-2 rounded-full text-sm font-semibold">
                  <LocateFixed size={15}/> From your location
                </span>
              )}
            </motion.div>
          )}
        </motion.div>

        <div className="max-w-6xl mx-auto space-y-6">
          {/* Map */}
          <motion.div initial={{ opacity:0,y:20 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}
            className="rounded-2xl overflow-hidden shadow-card border border-border relative" style={{ height:460 }}>

            <div ref={mapDiv} className="w-full h-full"/>

            {/* GPS button — top-right */}
            <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
              {!usingMe ? (
                <button onClick={locateMe} disabled={locating}
                  className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg hover:bg-gray-50 transition disabled:opacity-60">
                  {locating ? <Loader2 size={14} className="animate-spin"/> : <LocateFixed size={14}/>}
                  {locating ? "Locating…" : "Use my location"}
                </button>
              ) : (
                <button onClick={resetRoute}
                  className="flex items-center gap-2 bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-semibold shadow-lg hover:bg-blue-600 transition">
                  <X size={14}/> Reset route
                </button>
              )}
            </div>

            {/* Location error banner */}
            {locErr && (
              <div className="absolute bottom-3 left-3 right-16 z-[1000] bg-white border border-red-200 text-red-600 text-xs px-3 py-2 rounded-xl shadow-lg flex items-center gap-2">
                <AlertCircle size={13} className="shrink-0"/> {locErr}
                <button onClick={()=>setLocErr(null)} className="ml-auto"><X size={12}/></button>
              </div>
            )}

            {/* Legend */}
            {!locErr && (
              <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl px-3 py-2 text-xs space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full inline-block" style={{background:GREEN}}/> Petrolex Station</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full inline-block" style={{background:PRIMARY}}/> Favour Guest Homes</div>
                {usingMe && <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full inline-block bg-blue-500"/> Your location</div>}
              </div>
            )}
          </motion.div>

          {/* Video + Steps */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <motion.div initial={{ opacity:0,x:-30 }} whileInView={{ opacity:1,x:0 }} viewport={{ once:true }}
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

            <motion.div initial={{ opacity:0,x:30 }} whileInView={{ opacity:1,x:0 }} viewport={{ once:true }}
              className="lg:col-span-2 bg-card rounded-2xl p-6 shadow-card border border-border">
              <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <MapPin size={18} className="text-primary"/> {t.stepByStep}
              </h3>
              <ol className="space-y-3 text-sm text-muted-foreground font-body">
                {steps.map((step, i) => (
                  <motion.li key={i} initial={{ opacity:0,x:-20 }} whileInView={{ opacity:1,x:0 }}
                    viewport={{ once:true }} transition={{ delay:i*0.08 }} className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-warm">{i+1}</span>
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
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
export default DirectionsSection;
