import type { TripCategory } from "../src/booking-status";

/**
 * The class catalogue Operation's seating table sets, each class with its
 * models, in order: the seed creates it in a fresh database and
 * scripts/set-class-list.ts brings an existing one to it. Once there, ops
 * owns each class and model and edits them in the console. "2 + 1" is two
 * passengers in the back and one beside the driver; a VIP class seats its
 * passengers in the back only. Starred values in
 * docs/261019-vehicles-and-drivers.md are assumed until Operation confirms
 * them.
 */
export type ListedClass = {
  slug: string;
  category: TripCategory;
  name: string;
  description: string;
  sortOrder: number;
  minPassengers: number;
  maxPassengers: number;
  luggage: string;
  /** Its models' names, in order. */
  models: string[];
};

export const CLASS_LIST: ListedClass[] = [
  {
    slug: "sedan",
    category: "car-with-driver",
    name: "Sedan",
    description: "Two in the back and one beside the driver.",
    sortOrder: 1,
    minPassengers: 1,
    maxPassengers: 3,
    luggage: "2 medium bags",
    models: ["Toyota Vios", "Honda City"],
  },
  {
    slug: "sedan-vip",
    category: "car-with-driver",
    name: "Sedan VIP",
    description: "An executive saloon, with two in the back.",
    sortOrder: 2,
    minPassengers: 1,
    maxPassengers: 2,
    luggage: "2 medium bags",
    models: ["Toyota Camry", "Honda Accord"],
  },
  {
    slug: "mpv",
    category: "car-with-driver",
    name: "MPV",
    description: "Four in the back and one beside the driver.",
    sortOrder: 3,
    minPassengers: 1,
    maxPassengers: 5,
    luggage: "4 medium bags",
    models: ["Toyota Innova", "Toyota Veloz"],
  },
  {
    slug: "mpv-vip",
    category: "car-with-driver",
    name: "MPV VIP",
    description: "Four in captain seats at the back.",
    sortOrder: 4,
    minPassengers: 1,
    maxPassengers: 4,
    luggage: "4 medium bags",
    models: ["Toyota Vellfire", "Toyota Alphard"],
  },
  {
    slug: "van",
    category: "car-with-driver",
    name: "Van",
    description: "Seven passengers, each with a bag.",
    sortOrder: 5,
    minPassengers: 1,
    maxPassengers: 7,
    luggage: "7 medium bags",
    models: ["Nissan Urvan", "Toyota Hiace"],
  },
  {
    slug: "coach",
    category: "coach-charter",
    name: "Coach",
    description: "A 44-seater with a full luggage hold.",
    sortOrder: 1,
    minPassengers: 1,
    maxPassengers: 44,
    luggage: "40 large bags",
    models: ["Scania 44-seater", "Volvo 44-seater"],
  },
  {
    slug: "coach-vip",
    category: "coach-charter",
    name: "Coach VIP",
    description: "Wide executive seats, for corporate groups.",
    sortOrder: 2,
    minPassengers: 15,
    maxPassengers: 27,
    luggage: "25 large bags",
    models: ["Scania VIP 27-seater", "Volvo VIP 27-seater"],
  },
];
