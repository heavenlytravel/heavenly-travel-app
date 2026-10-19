import type { TripCategory } from "../src/booking-status";

/**
 * The class catalogue Operation's seating table sets, each class with the
 * models it starts with, in order: the seed creates it in a fresh database
 * and scripts/set-class-list.ts brings an existing one to it. Once there,
 * ops owns each class and model and edits them in the console, and the
 * vehicle form adds the models of the vehicles entered. "2 + 1" is two
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
  /** The models it starts with, in order. */
  models: { brand: string; name: string }[];
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
    models: [
      { brand: "Toyota", name: "Vios" },
      { brand: "Honda", name: "City" },
    ],
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
    models: [
      { brand: "Toyota", name: "Camry" },
      { brand: "Honda", name: "Accord" },
    ],
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
    models: [
      { brand: "Toyota", name: "Innova" },
      { brand: "Toyota", name: "Veloz" },
    ],
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
    models: [
      { brand: "Toyota", name: "Vellfire" },
      { brand: "Toyota", name: "Alphard" },
    ],
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
    models: [
      { brand: "Nissan", name: "Urvan" },
      { brand: "Toyota", name: "Hiace" },
    ],
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
    models: [
      { brand: "Scania", name: "44-seater" },
      { brand: "Volvo", name: "44-seater" },
    ],
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
    models: [
      { brand: "Scania", name: "VIP 27-seater" },
      { brand: "Volvo", name: "VIP 27-seater" },
    ],
  },
];
