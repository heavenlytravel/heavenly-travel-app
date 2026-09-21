/**
 * Sample data for the Locations screen, which is UI only for now. The fields
 * mirror `HomeDestination` in apps/web so that one `Location` table can later
 * feed both this screen and the home page.
 */

export const LOCATION_TYPES = ["airport", "city"] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export type AdminLocation = {
  id: string;
  name: string;
  /** Short line above the name on the home page card. */
  tag: string;
  type: LocationType;
  /** Airports only. Drawn large on the card instead of a photo. */
  airportCode: string;
  /** Inactive locations are hidden from customers. */
  isActive: boolean;
};

export const SAMPLE_LOCATIONS: AdminLocation[] = [
  {
    id: "klia",
    name: "KLIA",
    tag: "Airport gateway",
    type: "airport",
    airportCode: "KUL",
    isActive: true,
  },
  {
    id: "langkawi",
    name: "Langkawi",
    tag: "Island escape",
    type: "city",
    airportCode: "",
    isActive: true,
  },
  {
    id: "kuala-lumpur",
    name: "Kuala Lumpur",
    tag: "Capital city",
    type: "city",
    airportCode: "",
    isActive: true,
  },
  {
    id: "pulau-pinang",
    name: "Pulau Pinang",
    tag: "Culture & coast",
    type: "city",
    airportCode: "",
    isActive: true,
  },
];
