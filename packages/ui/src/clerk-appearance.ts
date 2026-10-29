/**
 * The one Clerk theme for both apps, passed to `ClerkProvider` so every
 * prebuilt component (sign in, sign up, user button, the account window)
 * matches. Only colours, font and fields live here: the sizing of the
 * sign-in card is `clerkAuthCard`, given to the sign-in and sign-up pages
 * alone, since the account window is a wider card of two columns that the
 * same rules would squeeze. The colours are
 * the brand's custom properties from @repo/tailwind-config, which Clerk reads
 * where it draws (`docs/260923-home-design.md`). The font is inherited from the
 * page, so the card takes the home page fonts in both apps, the title in
 * `--font-display`. The logo is drawn by `AuthShell`, not by Clerk.
 * `@repo/ui` does not depend on Clerk, so this is a plain object; the apps
 * type-check it when they pass it to the provider.
 */

const brand = "var(--brand)";
const ink = "var(--ink)";
const muted = "#45556c";
const line = "#cad5e2";

export const clerkAppearance = {
  options: { logoPlacement: "none" },
  variables: {
    colorPrimary: brand,
    colorPrimaryForeground: "#ffffff",
    colorForeground: ink,
    colorMutedForeground: muted,
    colorBackground: "#ffffff",
    colorInput: "#ffffff",
    colorInputForeground: ink,
    colorBorder: line,
    colorRing: brand,
    colorNeutral: ink,
    colorDanger: "#b42318",
    colorSuccess: "#157a74",
    fontFamily: "inherit",
    borderRadius: "0.75rem",
  },
  elements: {
    headerSubtitle: { color: muted },
    formButtonPrimary: {
      height: "2.75rem",
      fontSize: "0.95rem",
      fontWeight: 600,
      boxShadow: "none",
    },
    formFieldInput: { height: "2.75rem" },
    otpCodeFieldInput: { height: "3rem" },
    footerActionLink: { color: brand, fontWeight: 600 },
  },
} as const;

/**
 * The sign-in and sign-up card: as wide as the page allows up to 26rem,
 * the title in the display font. Given to `<SignIn>` and `<SignUp>` only.
 */
export const clerkAuthCard = {
  elements: {
    // Clerk's root has a fixed width; let it shrink on narrow screens.
    rootBox: { width: "100%", maxWidth: "26rem" },
    cardBox: {
      width: "100%",
      boxShadow: "0 22px 55px rgba(0, 38, 75, 0.14)",
    },
    card: { padding: "2rem" },
    headerTitle: {
      fontFamily: "var(--font-display, inherit)",
      fontWeight: 400,
      fontSize: "1.65rem",
      letterSpacing: "-0.01em",
    },
  },
} as const;

/** The user button in a header. */
export const clerkUserButton = {
  elements: {
    userButtonTrigger: { boxShadow: "none" },
  },
} as const;

/** The admin sign-in: the card with no sign-up link, and a deeper shadow for the dark page. */
export const clerkAdminSignIn = {
  elements: {
    ...clerkAuthCard.elements,
    footerAction: { display: "none" },
    cardBox: {
      ...clerkAuthCard.elements.cardBox,
      boxShadow: "0 22px 55px rgba(0, 15, 32, 0.5)",
    },
  },
} as const;
