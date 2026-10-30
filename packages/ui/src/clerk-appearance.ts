/**
 * The Clerk theme for the three apps, passed to `ClerkProvider`. Our own
 * screens (@repo/auth) draw the sign-in, the sign-up, the user menu and the
 * account window; what Clerk still draws itself, its bot check and any
 * window it opens on its own, takes the brand's colours from here. The
 * colours are the custom properties of @repo/tailwind-config, which Clerk
 * reads where it draws (`docs/260923-home-design.md`); the font is the
 * page's. `@repo/ui` does not depend on Clerk, so this is a plain object;
 * the apps type-check it when they pass it to the provider.
 */
export const clerkAppearance = {
  options: { logoPlacement: "none" },
  variables: {
    colorPrimary: "var(--brand)",
    colorPrimaryForeground: "#ffffff",
    colorForeground: "var(--ink)",
    colorMutedForeground: "var(--muted)",
    colorBackground: "#ffffff",
    colorInput: "#ffffff",
    colorInputForeground: "var(--ink)",
    colorBorder: "var(--edge)",
    colorRing: "var(--brand)",
    colorNeutral: "var(--ink)",
    colorDanger: "var(--danger)",
    colorSuccess: "var(--success)",
    fontFamily: "inherit",
    borderRadius: "0.75rem",
  },
  elements: {
    // "Secured by Clerk" (and "Development mode" on the development
    // instance), under anything Clerk draws, until its paid plan removes it.
    footerItem: { display: "none" },
  },
} as const;
