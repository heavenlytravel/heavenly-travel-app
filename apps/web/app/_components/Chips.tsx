/** A wrapped row of small grey labels, e.g. what a page borrowed or replaced. */
export function Chips({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
