/**
 * Content shared by the four "reimagined" pages under /landing/fable/reimagined.
 * Each page borrows the structure of a reference site (the current WordPress
 * site, Airbnb, Agoda, Booking.com) and applies it to Heavenly Travel's real
 * offer: coach charter and cars with driver across Malaysia.
 *
 * Prices are indicative placeholders so the layouts can be judged with real
 * numbers in them; every page says a quote confirms the final price.
 */

export const PHONE = "+60 X-XXX XXXX";
export const WHATSAPP_HREF = "https://wa.me/60XXXXXXXXX";

export type Vehicle = {
  id: string;
  name: string;
  kind: "car" | "coach";
  seats: number;
  luggage: string;
  image: string;
  alt: string;
  fromPerDay: number;
  perks: string[];
  rating: number;
  reviews: number;
};

export const FLEET: Vehicle[] = [
  {
    id: "sedan",
    name: "Executive sedan with driver",
    kind: "car",
    seats: 3,
    luggage: "2 large bags",
    image: "/brand/chauffeur.jpg",
    alt: "The leather cabin of a chauffeur-driven MPV",
    fromPerDay: 280,
    perks: ["Meet and greet", "Bottled water", "Child seat on request"],
    rating: 4.9,
    reviews: 212,
  },
  {
    id: "mpv",
    name: "Premium MPV, 6 seats",
    kind: "car",
    seats: 6,
    luggage: "5 large bags",
    image: "/brand/mpv.jpg",
    alt: "A line of MPVs parked by the sea under palm trees",
    fromPerDay: 450,
    perks: ["Captain seats", "USB charging", "Flight tracking"],
    rating: 4.9,
    reviews: 388,
  },
  {
    id: "van",
    name: "Passenger van, 10 seats",
    kind: "car",
    seats: 10,
    luggage: "8 large bags",
    image: "/brand/attractions.jpg",
    alt: "The Langkawi Sky Bridge above the rainforest",
    fromPerDay: 560,
    perks: ["Roof rack", "Cold aircon", "Same driver all trip"],
    rating: 4.8,
    reviews: 154,
  },
  {
    id: "minibus",
    name: "Minibus, 26 seats",
    kind: "coach",
    seats: 26,
    luggage: "Under-floor hold",
    image: "/brand/mice.jpg",
    alt: "The Langkawi International Convention Centre",
    fromPerDay: 950,
    perks: ["PA system", "Reclining seats", "Tour guide seat"],
    rating: 4.8,
    reviews: 97,
  },
  {
    id: "coach",
    name: "Executive coach, 44 seats",
    kind: "coach",
    seats: 44,
    luggage: "Full luggage bay",
    image: "/brand/coach.jpg",
    alt: "A fleet of green and white executive coaches",
    fromPerDay: 1450,
    perks: ["Toilet on board", "Wi-Fi", "Two drivers for long runs"],
    rating: 4.9,
    reviews: 176,
  },
];

export type Destination = {
  name: string;
  state: string;
  image: string;
  alt: string;
  blurb: string;
  drive: string;
};

export const DESTINATIONS: Destination[] = [
  {
    name: "Langkawi",
    state: "Kedah",
    image: "/brand/hero-langkawi.jpg",
    alt: "Eagle Square in Langkawi from the air",
    blurb: "Where we started. Airport, jetty and island day tours.",
    drive: "Island transfers from 20 min",
  },
  {
    name: "Kuala Lumpur",
    state: "Federal Territory",
    image: "/brand/chauffeur.jpg",
    alt: "The cabin of a chauffeur-driven MPV",
    blurb: "KLIA arrivals, city days and conference shuttles.",
    drive: "KLIA to city 1 h",
  },
  {
    name: "Penang",
    state: "Pulau Pinang",
    image: "/brand/attractions.jpg",
    alt: "The Langkawi Sky Bridge",
    blurb: "George Town heritage runs and Batu Ferringhi hotels.",
    drive: "Penang to Ipoh 2 h",
  },
  {
    name: "Cameron Highlands",
    state: "Pahang",
    image: "/brand/cable-car.jpg",
    alt: "The Langkawi cable car in mist",
    blurb: "Tea estates and cool air, driven by people who know the bends.",
    drive: "From KL 3 h 30",
  },
  {
    name: "Melaka",
    state: "Melaka",
    image: "/brand/mpv.jpg",
    alt: "MPVs parked by the sea",
    blurb: "Jonker Street weekends and the Dutch Square.",
    drive: "From KL 2 h",
  },
  {
    name: "Johor Bahru",
    state: "Johor",
    image: "/brand/coach.jpg",
    alt: "A fleet of executive coaches",
    blurb: "Legoland families and the causeway to Singapore.",
    drive: "To KL 3 h 30",
  },
];

export type Service = {
  id: string;
  title: string;
  text: string;
  image: string;
  alt: string;
};

export const SERVICES: Service[] = [
  {
    id: "transfers",
    title: "Airport and jetty transfers",
    text: "Met at arrivals with a name board, any hour. Flights tracked so a late landing is our problem, not yours.",
    image: "/brand/chauffeur.jpg",
    alt: "The cabin of a chauffeur-driven MPV",
  },
  {
    id: "car",
    title: "Car with driver",
    text: "A sedan, MPV or van with a local driver for the day, the week or the whole itinerary.",
    image: "/brand/mpv.jpg",
    alt: "A line of MPVs by the sea",
  },
  {
    id: "coach",
    title: "Coach charter",
    text: "26 to 44 seat coaches for tour groups, schools and companies, with the same driver throughout.",
    image: "/brand/coach.jpg",
    alt: "A fleet of executive coaches",
  },
  {
    id: "tours",
    title: "Day tours",
    text: "Langkawi island loops, the cable car and mangroves, Penang heritage, Cameron tea estates.",
    image: "/brand/cable-car.jpg",
    alt: "The Langkawi cable car",
  },
  {
    id: "mice",
    title: "MICE and events",
    text: "Conference shuttles, incentive groups and VIP movements, timed to the minute with a coordinator on site.",
    image: "/brand/mice.jpg",
    alt: "The Langkawi International Convention Centre",
  },
  {
    id: "attractions",
    title: "Attraction tickets",
    text: "Cable car, mangrove cruises and island hopping, added to your transfer so you skip the queue.",
    image: "/brand/attractions.jpg",
    alt: "The Langkawi Sky Bridge",
  },
];

export type Review = {
  name: string;
  from: string;
  trip: string;
  score: number;
  text: string;
};

export const REVIEWS: Review[] = [
  {
    name: "Siti",
    from: "Shah Alam",
    trip: "Family week in Langkawi, MPV",
    score: 10,
    text: "Our driver met us at the jetty, had the child seat fitted already and knew a quieter beach than the one in our guide.",
  },
  {
    name: "Daniel",
    from: "Singapore",
    trip: "Company retreat, 44-seat coach",
    score: 9.6,
    text: "Forty of us from JB to Cameron Highlands and back. On time both ways, cold air, one WhatsApp thread for everything.",
  },
  {
    name: "Mei Ling",
    from: "Penang",
    trip: "KLIA transfer, sedan",
    score: 10,
    text: "Flight was two hours late. Nobody had to be told. The name board was there when we walked out.",
  },
  {
    name: "Ahmad",
    from: "Kota Bharu",
    trip: "School trip, two minibuses",
    score: 9.8,
    text: "Drivers were patient with sixty teenagers and the school got all the licence paperwork before the trip without asking twice.",
  },
];

export const BADGES = [
  { image: "/brand/matta.jpg", alt: "MATTA member", label: "MATTA member" },
  {
    image: "/brand/mof.jpg",
    alt: "Ministry of Finance registered",
    label: "MOF registered",
  },
] as const;

export const STEPS = [
  {
    title: "Tell us the trip",
    text: "Pick-up, drop-off, date and group size. Here or on WhatsApp.",
  },
  {
    title: "Get a price and a vehicle",
    text: "One quote for the whole trip and the vehicle we'd choose for your group.",
  },
  {
    title: "Confirm",
    text: "Say yes and the date is held. Changes go through the same chat.",
  },
  {
    title: "Your driver is waiting",
    text: "Name and number the day before. The vehicle is there before you are.",
  },
] as const;

export function ringgit(amount: number) {
  return `RM ${amount.toLocaleString("en-MY")}`;
}
