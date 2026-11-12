import type { TripCategory } from "../src/booking-status";

/**
 * The class catalogue a fresh database starts with, production's as it was
 * on 2026-11-11, each class a tier of a type with the models it starts
 * with, in order within its category. The seed creates it; once there, ops
 * owns each class and model and edits them in the console, and the vehicle
 * form adds the models of the vehicles entered. Its names and slugs are
 * made from the tier and the type (`classNameOf`). See
 * docs/261019-vehicles-and-drivers.md and
 * docs/261111-catalogue-booking-flow-and-ops.md, part A.
 */

export type ListedClass = {
  type: string;
  /** Empty for a class that is its type alone. */
  tier: string;
  category: TripCategory;
  description: string;
  minPassengers: number;
  maxPassengers: number;
  luggage: string;
  isActive: boolean;
  /** The models it starts with, in order. */
  models: { brand: string; name: string }[];
};

export const CLASS_LIST: ListedClass[] = [
  {
    type: "Sedan",
    tier: "Standard",
    category: "car-with-driver",
    description:
      "Toyota Vios/Honda City, a comfortable and affordable sedan for solo and couple travellers.",
    minPassengers: 1,
    maxPassengers: 2,
    luggage: "3 medium bags",
    isActive: true,
    models: [
      { brand: "Toyota", name: "Vios" },
      { brand: "Honda", name: "City" },
    ],
  },
  {
    type: "Sedan",
    tier: "Deluxe",
    category: "car-with-driver",
    description:
      "Toyota Camry, a more spacious and refined sedan for travellers who want extra comfort.",
    minPassengers: 1,
    maxPassengers: 2,
    luggage: "3 medium bags",
    isActive: true,
    models: [
      { brand: "Toyota", name: "Camry" },
      { brand: "Honda", name: "Accord" },
    ],
  },
  {
    type: "SUV",
    tier: "Standard",
    category: "car-with-driver",
    description:
      "Honda CR-V/Proton X70, a comfortable SUV with higher seating and extra space for guests who want more than a sedan.",
    minPassengers: 1,
    maxPassengers: 3,
    luggage: "3 medium bags",
    isActive: true,
    models: [
      { brand: "Honda", name: "CR-V" },
      { brand: "Proton", name: "X70" },
    ],
  },
  {
    type: "MPV",
    tier: "Standard",
    category: "car-with-driver",
    description:
      "Toyota Innova Zenix/Veloz, a roomy and practical MPV for families and small groups who need extra space for people and luggage.",
    minPassengers: 1,
    maxPassengers: 4,
    luggage: "4 medium bags",
    isActive: true,
    models: [
      { brand: "Toyota", name: "Innova" },
      { brand: "Toyota", name: "Veloz" },
      { brand: "Perodua", name: "Alza" },
    ],
  },
  {
    type: "MPV",
    tier: "Deluxe",
    category: "car-with-driver",
    description:
      "Toyota Vellfire, a premium MPV with spacious captain-style seating for guests who want comfort and a touch of luxury.",
    minPassengers: 1,
    maxPassengers: 4,
    luggage: "4 medium bags",
    isActive: true,
    models: [
      { brand: "Toyota", name: "Vellfire" },
      { brand: "Toyota", name: "Alphard" },
    ],
  },
  {
    type: "MPV",
    tier: "Executive",
    category: "car-with-driver",
    description:
      "Toyota Alphard Executive, VIP and corporate travel with the highest level of comfort and prestige.",
    minPassengers: 1,
    maxPassengers: 4,
    luggage: "4 medium bags",
    isActive: true,
    models: [{ brand: "Toyota", name: "Alphard Executive" }],
  },
  {
    type: "Van",
    tier: "Standard",
    category: "car-with-driver",
    description:
      "Toyota Hiace/Nissan Urvan, a spacious and practical van for large groups who need to travel together at a good price per person.",
    minPassengers: 4,
    maxPassengers: 8,
    luggage: "8 medium bags",
    isActive: true,
    models: [
      { brand: "Toyota", name: "Hiace" },
      { brand: "Nissan", name: "Urvan" },
    ],
  },
  {
    type: "Van",
    tier: "VIP Seating",
    category: "car-with-driver",
    description:
      "A premium van with luxury leather seating for corporate groups and VIP delegations.",
    minPassengers: 4,
    maxPassengers: 7,
    luggage: "7 medium bags",
    isActive: true,
    models: [
      { brand: "Nissan", name: "Urvan" },
      { brand: "Toyota", name: "Hiace" },
    ],
  },
  {
    type: "Truck",
    tier: "",
    category: "car-with-driver",
    description: "For luggage transfers on arrival or departure.",
    minPassengers: 1,
    maxPassengers: 1,
    luggage: "A truckload",
    isActive: false,
    models: [{ brand: "Mitsubishi", name: "Canter" }],
  },
  {
    type: "Coach",
    tier: "44 Seater Standard",
    category: "coach-charter",
    description:
      "A full-size coach for big groups who want to travel together in comfort: company trips, school and university outings, weddings, conferences and event transfers.",
    minPassengers: 13,
    maxPassengers: 44,
    luggage: "44 medium bags",
    isActive: true,
    models: [
      { brand: "Scania", name: "44-seater" },
      { brand: "Volvo", name: "44-seater" },
    ],
  },
  {
    type: "Coach",
    tier: "VIP",
    category: "coach-charter",
    description: "Wide executive seats, for corporate groups.",
    minPassengers: 15,
    maxPassengers: 27,
    luggage: "25 large bags",
    isActive: false,
    models: [
      { brand: "Scania", name: "VIP 27-seater" },
      { brand: "Volvo", name: "VIP 27-seater" },
    ],
  },
];
