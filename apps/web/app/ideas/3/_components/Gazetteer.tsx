import styles from "../page.module.css";
import { DESTINATIONS, SERVICES } from "../../../_lib/content";
import { PLACES, driveMinutes, formatDrive } from "../../../_lib/routes";

type Entry = {
  head: string;
  qualifier?: string;
  text?: string;
  ref: string;
  href: string;
};

/** Where on this sheet each service is best looked up. */
const SERVICE_REFS: Record<string, { ref: string; href: string } | undefined> =
  {
    transfers: { ref: "Chart, KIA row", href: "#chart" },
    car: { ref: "Key 1 to 3", href: "#key" },
    coach: { ref: "Key 4, 5", href: "#key" },
    tours: { ref: "Plate 3", href: "#plates" },
    mice: { ref: "Plate 2", href: "#plates" },
    attractions: { ref: "Plate 3", href: "#plates" },
  };

function buildEntries(): Entry[] {
  const featured = new Map(DESTINATIONS.map((d) => [d.name, d]));
  const places = PLACES.map((p): Entry => {
    const d = featured.get(p.name);
    return {
      head: p.name,
      qualifier: p.state,
      text: d?.blurb ?? p.note,
      ref: d?.drive ?? `From KL ${formatDrive(driveMinutes("kl", p.id))}`,
      href: "#chart",
    };
  });
  const services = SERVICES.map((s): Entry => {
    const at = SERVICE_REFS[s.id];
    return {
      head: s.title,
      text: s.text,
      ref: at?.ref ?? "Chart",
      href: at?.href ?? "#chart",
    };
  });
  return [...places, ...services].sort((a, b) =>
    a.head.localeCompare(b.head, "en"),
  );
}

function byLetter(entries: Entry[]): [string, Entry[]][] {
  const groups = new Map<string, Entry[]>();
  for (const entry of entries) {
    const letter = entry.head.charAt(0).toUpperCase();
    groups.set(letter, [...(groups.get(letter) ?? []), entry]);
  }
  return [...groups];
}

/** Places and services in one alphabetical index, as at the back of an atlas. */
export function Gazetteer() {
  return (
    <div className="gap-x-10 sm:columns-2 xl:columns-3">
      {byLetter(buildEntries()).map(([letter, entries]) => (
        <section
          key={letter}
          aria-label={letter}
          className="mb-6 break-inside-avoid"
        >
          <h3 className="border-b border-(--ink) pb-0.5 text-[1.7rem] leading-none font-bold">
            {letter}
          </h3>
          <ul>
            {entries.map((e) => (
              <li key={e.head} className="border-b border-(--rule) py-2">
                <p className="flex items-baseline text-[15px]">
                  <span className="font-semibold">
                    {e.head}
                    {e.qualifier && (
                      <span className="font-normal text-(--ink-soft)">
                        , {e.qualifier}
                      </span>
                    )}
                  </span>
                  <span aria-hidden="true" className={styles.leader} />
                  <a
                    href={e.href}
                    className="shrink-0 font-medium text-(--motorway) underline decoration-[0.5px] underline-offset-3 hover:text-(--ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--motorway)"
                  >
                    {e.ref}
                  </a>
                </p>
                {e.text && (
                  <p
                    className={`${styles.italic} mt-0.5 pr-6 text-[13.5px] leading-snug text-(--ink-soft)`}
                  >
                    {e.text}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
