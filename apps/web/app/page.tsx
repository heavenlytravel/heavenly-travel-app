import Link from "next/link";

const LINKS = [
  { href: "/landing", label: "Landing pages" },
  { href: "/ideas", label: "Ideas" },
  { href: "/model", label: "Model stats" },
];

export default function Page() {
  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
      <main className="mx-auto max-w-3xl px-5 pt-16 pb-32">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Heavenly Travel
        </h1>
        <nav aria-label="Main" className="mt-10">
          <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex items-baseline justify-between gap-4 py-4 font-medium hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {link.label}
                  <code className="text-sm font-normal text-neutral-500">
                    {link.href}
                  </code>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
    </div>
  );
}
