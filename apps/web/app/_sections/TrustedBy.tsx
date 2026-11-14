import Image from "next/image";
import { isWebUrl, type ClientLogo, type PageSectionOf } from "@repo/db";
import { SectionShell, type SectionLook } from "./SectionShell";

/** How tall a logo stands, its width following its own shape. */
const LOGO_HEIGHT = 44;

/**
 * Our clients' logos, each named by its alt text, on a pale tray: quiet
 * in grey until the pointer is over one, which takes its colours. A logo
 * with the client's site opens it in a new tab. Those without an image
 * are left out.
 */
export function TrustedBy({
  look,
  section,
}: {
  look: SectionLook;
  section: PageSectionOf<"trusted-by">;
}) {
  const logos = section.logos.filter(
    (logo): logo is ClientLogo & { image: NonNullable<ClientLogo["image"]> } =>
      logo.image !== null,
  );
  return (
    <SectionShell look={look} id="trusted-by" section={section}>
      <ul
        className={`mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-4 gap-y-3 rounded-panel bg-shade px-4 py-5 sm:gap-x-6 sm:px-8 sm:py-7 ${
          look === "home" ? "justify-center" : ""
        }`}
      >
        {logos.map((logo, i) => {
          const width = Math.round(
            (LOGO_HEIGHT * logo.image.width) / logo.image.height,
          );
          const picture = (
            <Image
              src={logo.image.url}
              alt={logo.name}
              width={width}
              height={LOGO_HEIGHT}
              sizes={`${width}px`}
              className="h-11 w-auto max-w-[160px] object-contain opacity-75 grayscale transition duration-300 group-hover:opacity-100 group-hover:grayscale-0 motion-reduce:transition-none"
            />
          );
          return (
            <li
              key={i}
              className="group grid h-16 min-w-0 place-items-center rounded-control bg-white px-4 shadow-[0_1px_0_var(--color-card-edge)]"
            >
              {isWebUrl(logo.link) ? (
                <a
                  href={logo.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring rounded-sm"
                >
                  {picture}
                </a>
              ) : (
                picture
              )}
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}
