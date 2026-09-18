/**
 * The alternative landing designs kept for comparison, at /landing/1 to
 * /landing/3. The home page at / is the one in use. How each design looks, in
 * colour and type, is written up in docs/landing-designs.md.
 */

export type Landing = {
  number: number;
  href: string;
  label: string;
};

export const LANDINGS: Landing[] = [
  { number: 1, href: "/landing/1", label: "Fleet and destinations" },
  { number: 2, href: "/landing/2", label: "Quiet chauffeur service" },
  { number: 3, href: "/landing/3", label: "Friendly pre-booked rides" },
];
