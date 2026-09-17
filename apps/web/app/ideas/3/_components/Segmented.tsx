"use client";

/** A radio group drawn as a row of square, ruled segments. */
export function Segmented<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  className = "",
}: {
  name: string;
  legend: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <fieldset className={`m-0 min-w-0 border-0 p-0 ${className}`}>
      <legend className="sr-only">{legend}</legend>
      <div className="flex">
        {options.map((o) => (
          <label
            key={o.value}
            className="-mr-px flex-1 cursor-pointer border border-(--ink) px-3 py-2 text-center text-[13px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase select-none hover:not-has-checked:bg-(--ink)/8 has-checked:bg-(--ink) has-checked:text-(--sheet) has-focus-visible:relative has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--motorway)"
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
