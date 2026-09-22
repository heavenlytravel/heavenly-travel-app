/**
 * The one Clerk theme for both apps, passed to `ClerkProvider` so every
 * prebuilt component (sign in, sign up, user button) matches. The palette is
 * the home page's (`docs/landing-designs.md`). The font is inherited from the
 * page, so the card takes the home page fonts on the customer site and Geist
 * on the admin console. `@repo/ui` does not depend on Clerk, so this is a
 * plain object; the apps type-check it when they pass it to the provider.
 */

const deep = "#073c36";
const ink = "#082f2b";
const gold = "#caa243";
const muted = "#4a5f5b";
const line = "#d5dedb";

export const clerkAppearance = {
  variables: {
    colorPrimary: deep,
    colorPrimaryForeground: "#ffffff",
    colorForeground: ink,
    colorMutedForeground: muted,
    colorBackground: "#ffffff",
    colorInput: "#ffffff",
    colorInputForeground: ink,
    colorBorder: line,
    colorRing: gold,
    colorNeutral: ink,
    colorDanger: "#b42318",
    colorSuccess: "#157a74",
    fontFamily: "inherit",
    borderRadius: "0.75rem",
  },
  elements: {
    // Clerk's root has a fixed width; let it shrink on narrow screens.
    rootBox: { width: "100%", maxWidth: "26rem" },
    cardBox: {
      width: "100%",
      boxShadow: "0 22px 55px rgba(9, 43, 39, 0.14)",
    },
    card: { padding: "2rem" },
    headerTitle: {
      fontFamily: "var(--font-display, inherit)",
      fontWeight: 400,
      fontSize: "1.65rem",
      letterSpacing: "-0.01em",
    },
    headerSubtitle: { color: muted },
    formButtonPrimary: {
      height: "2.75rem",
      fontSize: "0.95rem",
      fontWeight: 600,
      boxShadow: "none",
    },
    formFieldInput: { height: "2.75rem" },
    otpCodeFieldInput: { height: "3rem" },
    footerActionLink: { color: deep, fontWeight: 600 },
  },
} as const;

/** Layout for the admin sign-in: logo in the card, no sign-up link. */
export const clerkAdminSignIn = {
  options: {
    logoPlacement: "inside",
    logoImageUrl: "/brand/logo-blue.svg",
  },
  elements: {
    footerAction: { display: "none" },
    // A deeper shadow so the card sits on the dark green, not a pale halo.
    cardBox: { boxShadow: "0 22px 55px rgba(1, 23, 21, 0.5)" },
  },
} as const;
