import { motion } from "framer-motion";
import { MapPin, Wifi, Shield, Fuel, Snowflake } from "lucide-react";
import { useLang } from "@/hooks/useLang";
import heroImg from "@/assets/room2.png";

const HeroSection = () => {
  const { t } = useLang();

  const features = [
    { icon: Wifi, label: t.freeWifi },
    { icon: Snowflake, label: t.acTv },
    { icon: Shield, label: t.security247 },
    { icon: Fuel, label: t.gasProvided },
    { icon: MapPin, label: "Etougébé" },
  ];

  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden pt-16">
      <div className="absolute inset-0">
        <img src={heroImg} alt="Favour Guest Homes" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 via-foreground/60 to-transparent" />
      </div>

      <div className="relative container mx-auto px-4 py-20">
        <div className="max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <span className="inline-block gradient-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold mb-6">
              {t.heroLocation}
            </span>
            <h1 className="text-4xl md:text-6xl font-display font-black text-primary-foreground leading-tight mb-4">
              FAVOUR<br />
              <span className="text-primary">GUEST HOMES</span>
            </h1>
            <p className="text-primary-foreground/80 font-body text-lg mb-8 max-w-lg">
              {t.heroTagline}
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }} className="flex flex-wrap gap-3 mb-8">
            {features.map(f => (
              <div key={f.label} className="flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 text-primary-foreground px-4 py-2 rounded-full text-sm">
                <f.icon size={16} className="text-primary" />
                {f.label}
              </div>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="flex flex-wrap gap-4">
            <a href="#rooms" className="gradient-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold shadow-warm hover:opacity-90 transition text-lg">
              {t.viewRooms}
            </a>
            <a href="#reservation" className="border-2 border-primary-foreground/30 text-primary-foreground px-8 py-3 rounded-lg font-semibold hover:bg-primary-foreground/10 transition text-lg">
              {t.bookNow}
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
