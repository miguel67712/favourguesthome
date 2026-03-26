import { MapPin, Phone, Facebook } from "lucide-react";
import { useLang } from "@/hooks/useLang";

const Footer = () => {
  const { t } = useLang();

  return (
    <footer className="gradient-hero text-primary-foreground py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-display text-2xl font-bold mb-3">Favour Guest Homes</h3>
            <p className="text-primary-foreground/70 text-sm">{t.footerDesc}</p>
          </div>
          <div>
            <h4 className="font-display text-lg font-bold mb-3">{t.contact}</h4>
            <div className="space-y-2 text-sm text-primary-foreground/80">
              <p className="flex items-center gap-2"><Phone size={14} /> (237) 652 30 01 64</p>
              <p className="flex items-center gap-2"><MapPin size={14} /> Carrefour Etougébé, Yaoundé</p>
              <a href="https://facebook.com/FavourGuestHomes" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-primary-foreground transition">
                <Facebook size={14} /> Favour Guest Homes
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-display text-lg font-bold mb-3">{t.quickLinks}</h4>
            <div className="space-y-2 text-sm text-primary-foreground/80">
              <a href="#rooms" className="block hover:text-primary-foreground transition">{t.ourRoomsLink}</a>
              <a href="#reviews" className="block hover:text-primary-foreground transition">{t.reviews}</a>
              <a href="#directions" className="block hover:text-primary-foreground transition">{t.directions}</a>
              <a href="#reservation" className="block hover:text-primary-foreground transition">{t.bookNow}</a>
            </div>
          </div>
        </div>
        <div className="border-t border-primary-foreground/20 mt-8 pt-6 text-center text-primary-foreground/50 text-sm">
          © {new Date().getFullYear()} Favour Guest Homes. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
