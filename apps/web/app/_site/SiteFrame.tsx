import type { ComponentProps, ReactNode } from "react";
import { Footer } from "../_components/Footer";
import { SiteHeader } from "../_components/SiteHeader";
import { PreviewBar } from "../_components/PreviewBar";
import { fontVars } from "../_home/fonts";
import { headerDestinations } from "../_lib/locations";

/**
 * What the site's own pages share, and the blog's: the home page's type
 * and palette, the header, and the footer, its draft on a staff preview.
 * `overlay` floats the header over the home page's hero. `preview` is
 * the preview bar a staff preview floats over the page: where the page
 * stands, its editor, and the way to the pages previewed with it.
 */
export async function SiteFrame({
  overlay = false,
  preview,
  children,
}: {
  overlay?: boolean;
  preview?: ComponentProps<typeof PreviewBar>;
  children: ReactNode;
}) {
  return (
    <div
      className={`${fontVars} min-h-screen bg-canvas font-sans leading-normal text-body antialiased`}
    >
      <SiteHeader overlay={overlay} destinations={await headerDestinations()} />
      {children}
      <Footer preview={preview !== undefined} />
      {preview && <PreviewBar {...preview} />}
    </div>
  );
}
