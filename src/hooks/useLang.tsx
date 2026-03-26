import { createContext, useContext, useState, ReactNode } from "react";

type Lang = "en" | "fr";

const translations = {
  en: {
    // Navbar
    home: "Home",
    rooms: "Rooms",
    reviews: "Reviews",
    directions: "Directions",
    reservation: "Reservation",
    admin: "Admin",
    contactUs: "Contact Us",
    logout: "Logout",

    // Hero
    heroLocation: "Carrefour Etougébé, Yaoundé",
    heroTagline: "A perfect getaway! Nestled in a vibrant neighborhood with stylish decor, abundant natural light, and a cozy atmosphere. AC, TV, fridge, hot water, gas, and 24/7 security in every room.",
    viewRooms: "View Rooms",
    bookNow: "Book Now",
    freeWifi: "Free WiFi",
    acTv: "AC & TV",
    security247: "24/7 Security",
    gasProvided: "Gas Provided",

    // Rooms
    ourRooms: "Our",
    roomsHighlight: "Rooms",
    roomsDesc: "Choose from our selection of comfortable rooms, studios, and apartments.",
    allRooms: "All Rooms",
    available: "Available",
    occupied: "Occupied",
    viewDetails: "View Details",
    ac: "AC",
    tv: "TV",
    hotWater: "Hot Water",
    gas: "Gas",

    // Reviews
    guestTestimonials: "Guest",
    testimonialsHighlight: "Testimonials",
    leaveReview: "Leave a Review",
    shareExperience: "Share Your Experience",
    yourName: "Your Name",
    yourRating: "Your Rating",
    tellUs: "Tell us about your stay...",
    submitReview: "Submit Review",
    submitting: "Submitting...",
    reviewsCount: "reviews",

    // Directions
    howToFind: "How to",
    findUsHighlight: "Find Us",
    fromPetrolex: "From Petrolex Station Etoug-ébé to Favour Guest Homes",
    walk: "walk",
    videoDirections: "Video Directions",
    followRoute: "Follow this route from Petrolex Station",
    stepByStep: "Step-by-Step Directions",
    needHelp: "Need help finding us?",
    callUs: "Call us at",
    step1: "Start at Petrolex Station, Carrefour Etougébé",
    step2: "Head towards the market road",
    step3: "Take the first right after the pharmacy",
    step4: "Continue straight for about 200 meters",
    step5: "Favour Guest Homes will be on your left",

    // Reservation
    makeA: "Make a",
    reservationHighlight: "Reservation",
    reservationDesc: "Book your stay — fill in the form and we'll confirm via WhatsApp!",
    fullName: "Full Name",
    phone: "Phone",
    roomType: "Room Type",
    price: "Price",
    checkIn: "Check-in",
    checkOut: "Check-out",
    selectRoom: "Select Room",
    anyAvailable: "Any available room",
    noRoomsAvailable: "No rooms available for this type",
    additionalNotes: "Additional Notes",
    bookViaWhatsApp: "Book via WhatsApp",
    singleRoom: "Single Room",
    studio: "Studio",
    apartment: "Apartment",
    night: "night",
    reservationSuccess: "Reservation submitted! We'll confirm shortly.",
    reservationError: "Failed to submit reservation. Please try WhatsApp.",
    fillFields: "Please fill in all required fields.",
    whatsappMsg: "Hello! I'd like to book a {type} at Favour Guest Homes.\n\nName: {name}\nPhone: {phone}\nCheck-in: {checkIn}\nCheck-out: {checkOut}",

    // Footer
    footerDesc: "A perfect getaway with stylish decor, abundant natural light, and a cozy atmosphere.",
    contact: "Contact",
    quickLinks: "Quick Links",
    ourRoomsLink: "Our Rooms",

    // Auth
    welcomeTo: "Welcome to Favour",
    guestHomes: "Guest Homes",
    signInExplore: "Sign in to explore our rooms",
    createAccount: "Create an account to get started",
    email: "Email",
    password: "Password",
    signIn: "Sign In",
    createAccountBtn: "Create Account",
    pleaseWait: "Please wait...",
    noAccount: "Don't have an account?",
    hasAccount: "Already have an account?",
    signUpHere: "Sign up here",
    signInHere: "Sign in here",
    invalidCredentials: "Incorrect email or password. Please try again.",
    emailAlreadyUsed: "This email is already registered. Please sign in instead.",
    reviewError: "Failed to submit review",
    reviewSuccess: "Thank you for your review!",
    fillAllFields: "Please fill in all fields",
  },
  fr: {
    // Navbar
    home: "Accueil",
    rooms: "Chambres",
    reviews: "Avis",
    directions: "Itinéraire",
    reservation: "Réservation",
    admin: "Admin",
    contactUs: "Contactez-nous",
    logout: "Déconnexion",

    // Hero
    heroLocation: "Carrefour Etougébé, Yaoundé",
    heroTagline: "Une escapade parfaite ! Niché dans un quartier animé avec un décor élégant, une lumière naturelle abondante et une atmosphère chaleureuse. Climatisation, TV, frigo, eau chaude, gaz et sécurité 24h/24 dans chaque chambre.",
    viewRooms: "Voir les Chambres",
    bookNow: "Réserver",
    freeWifi: "WiFi Gratuit",
    acTv: "Clim & TV",
    security247: "Sécurité 24/7",
    gasProvided: "Gaz Fourni",

    // Rooms
    ourRooms: "Nos",
    roomsHighlight: "Chambres",
    roomsDesc: "Choisissez parmi notre sélection de chambres, studios et appartements confortables.",
    allRooms: "Toutes les Chambres",
    available: "Disponible",
    occupied: "Occupé",
    viewDetails: "Voir Détails",
    ac: "Clim",
    tv: "TV",
    hotWater: "Eau Chaude",
    gas: "Gaz",

    // Reviews
    guestTestimonials: "Témoignages",
    testimonialsHighlight: "Clients",
    leaveReview: "Laisser un Avis",
    shareExperience: "Partagez Votre Expérience",
    yourName: "Votre Nom",
    yourRating: "Votre Note",
    tellUs: "Parlez-nous de votre séjour...",
    submitReview: "Envoyer l'Avis",
    submitting: "Envoi...",
    reviewsCount: "avis",

    // Directions
    howToFind: "Comment Nous",
    findUsHighlight: "Trouver",
    fromPetrolex: "De la Station Petrolex Etoug-ébé à Favour Guest Homes",
    walk: "à pied",
    videoDirections: "Vidéo d'Itinéraire",
    followRoute: "Suivez cette route depuis la Station Petrolex",
    stepByStep: "Itinéraire Étape par Étape",
    needHelp: "Besoin d'aide pour nous trouver ?",
    callUs: "Appelez-nous au",
    step1: "Commencez à la Station Petrolex, Carrefour Etougébé",
    step2: "Dirigez-vous vers la route du marché",
    step3: "Prenez la première à droite après la pharmacie",
    step4: "Continuez tout droit sur environ 200 mètres",
    step5: "Favour Guest Homes sera sur votre gauche",

    // Reservation
    makeA: "Faire une",
    reservationHighlight: "Réservation",
    reservationDesc: "Réservez votre séjour — remplissez le formulaire et nous confirmerons via WhatsApp !",
    fullName: "Nom Complet",
    phone: "Téléphone",
    roomType: "Type de Chambre",
    price: "Prix",
    checkIn: "Arrivée",
    checkOut: "Départ",
    selectRoom: "Sélectionner une Chambre",
    anyAvailable: "N'importe quelle chambre disponible",
    noRoomsAvailable: "Aucune chambre disponible pour ce type",
    additionalNotes: "Notes Supplémentaires",
    bookViaWhatsApp: "Réserver via WhatsApp",
    singleRoom: "Chambre Simple",
    studio: "Studio",
    apartment: "Appartement",
    night: "nuit",
    reservationSuccess: "Réservation soumise ! Nous confirmerons sous peu.",
    reservationError: "Échec de la réservation. Essayez WhatsApp.",
    fillFields: "Veuillez remplir tous les champs obligatoires.",
    whatsappMsg: "Bonjour ! Je souhaite réserver un(e) {type} à Favour Guest Homes.\n\nNom : {name}\nTéléphone : {phone}\nArrivée : {checkIn}\nDépart : {checkOut}",

    // Footer
    footerDesc: "Une escapade parfaite avec un décor élégant, une lumière naturelle abondante et une atmosphère chaleureuse.",
    contact: "Contact",
    quickLinks: "Liens Rapides",
    ourRoomsLink: "Nos Chambres",

    // Auth
    welcomeTo: "Bienvenue à Favour",
    guestHomes: "Guest Homes",
    signInExplore: "Connectez-vous pour explorer nos chambres",
    createAccount: "Créez un compte pour commencer",
    email: "E-mail",
    password: "Mot de passe",
    signIn: "Se Connecter",
    createAccountBtn: "Créer un Compte",
    pleaseWait: "Veuillez patienter...",
    noAccount: "Pas de compte ?",
    hasAccount: "Déjà un compte ?",
    signUpHere: "Inscrivez-vous ici",
    signInHere: "Connectez-vous ici",
    invalidCredentials: "Email ou mot de passe incorrect. Veuillez réessayer.",
    emailAlreadyUsed: "Cet email est déjà enregistré. Veuillez vous connecter.",
    reviewError: "Échec de l'envoi de l'avis",
    reviewSuccess: "Merci pour votre avis !",
    fillAllFields: "Veuillez remplir tous les champs",
  },
};

type Translations = typeof translations.en;

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
}

const LangCtx = createContext<LangContextType>({
  lang: "en",
  setLang: () => {},
  t: translations.en,
});

export const LangProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("fg-lang");
    return (saved === "fr" ? "fr" : "en") as Lang;
  });

  const handleSetLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem("fg-lang", l);
  };

  return (
    <LangCtx.Provider value={{ lang, setLang: handleSetLang, t: translations[lang] }}>
      {children}
    </LangCtx.Provider>
  );
};

export const useLang = () => useContext(LangCtx);
