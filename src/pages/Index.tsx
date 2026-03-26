import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import RoomsSection from "@/components/RoomsSection";
import ReviewsSection from "@/components/ReviewsSection";
import DirectionsSection from "@/components/DirectionsSection";
import ReservationSection from "@/components/ReservationSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <RoomsSection />
      <ReviewsSection />
      <DirectionsSection />
      <ReservationSection />
      <Footer />
    </div>
  );
};

export default Index;
