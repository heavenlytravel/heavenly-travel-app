"use client";

import {
  IMAGE_SIZES,
  SECTION_HINTS,
  SECTION_LIMITS,
  SERVICE_CARD_LINK_KINDS,
  WHY_US_ICONS,
  WHY_US_ICON_LABELS,
  isWebUrl,
  isWhyUsIcon,
  type PageKind,
} from "@repo/db";
import { Field, Input, Textarea } from "@repo/ui/field";
import { Select } from "@repo/ui/select";
import { Counted } from "../Count";
import { ImageField } from "../ImageField";
import { LinkTargetFields, targetNoteOf } from "../LinkTargetFields";
import { CopyFrom } from "./CopyFrom";
import type { SectionData } from "./data";
import { rowed, type FormSection, type FormSectionOf } from "./form";
import { ItemList } from "./ItemList";
import { VehiclePicker } from "./VehiclePicker";

const L = SECTION_LIMITS;

/** A line of text, its count against its limit beside its label. */
function Line({
  label,
  value,
  limit,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  limit: number;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <Field
      label={<Counted label={label} value={value.trim()} limit={limit} />}
      hint={hint}
    >
      <Input
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

/** A few lines of text, its count against its limit beside its label. */
function Lines({
  label,
  value,
  limit,
  rows = 2,
  onChange,
}: {
  label: string;
  value: string;
  limit: number;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={<Counted label={label} value={value.trim()} limit={limit} />}>
      <Textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

/** How many posts Latest News may show. */
const NEWS_COUNTS = Array.from({ length: L.maxNews - L.minNews + 1 }, (_, i) =>
  String(L.minNews + i),
);

/**
 * The fields of one section, unfolded under its row: its heading, then
 * what its type holds. A section read live says where its things come
 * from.
 */
export function SectionFields({
  kind,
  section,
  data,
  onChange,
}: {
  kind: PageKind;
  section: FormSection;
  data: SectionData;
  onChange: (section: FormSection) => void;
}) {
  const edit = (patch: Partial<FormSection>) =>
    onChange({ ...section, ...patch } as FormSection);

  return (
    <div className="grid gap-5">
      <p className="text-caption text-muted">
        {SECTION_HINTS[section.type]}
        {section.type === "destinations" && kind === "home"
          ? " They are under Top Choices, below the page's cards."
          : ""}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Line
          label="Line Over the Title"
          value={section.eyebrow}
          limit={L.eyebrow}
          onChange={(eyebrow) => edit({ eyebrow })}
          hint="Optional."
        />
        <Line
          label="Title"
          value={section.title}
          limit={L.title}
          onChange={(title) => edit({ title })}
          hint={
            section.type === "why-us" && kind === "home"
              ? "Optional here: the home page's strip has long gone without one."
              : undefined
          }
        />
        <div className="sm:col-span-2">
          <Line
            label="Line Under the Title"
            value={section.lead}
            limit={L.lead}
            onChange={(lead) => edit({ lead })}
            hint="Optional."
          />
        </div>
      </div>
      <ItemsOf section={section} data={data} onChange={onChange} />
    </div>
  );
}

/** What the section's type holds. */
function ItemsOf({
  section,
  data,
  onChange,
}: {
  section: FormSection;
  data: SectionData;
  onChange: (section: FormSection) => void;
}) {
  switch (section.type) {
    case "why-us":
      return (
        <ItemList
          items={section.points}
          name="Point"
          limit={L.points}
          addLabel="Add Point"
          newItem={() => rowed({ icon: "check" as const, title: "", text: "" })}
          onChange={(points) => onChange({ ...section, points })}
        >
          {(point, update) => (
            <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
              <Field label="Icon">
                <Select
                  value={point.icon}
                  options={WHY_US_ICONS.map((icon) => ({
                    value: icon,
                    label: WHY_US_ICON_LABELS[icon],
                  }))}
                  onValueChange={(icon) => {
                    if (isWhyUsIcon(icon)) update({ icon });
                  }}
                />
              </Field>
              <Line
                label="Title"
                value={point.title}
                limit={L.pointTitle}
                onChange={(title) => update({ title })}
              />
              <div className="sm:col-span-2">
                <Line
                  label="Line"
                  value={point.text}
                  limit={L.pointText}
                  onChange={(text) => update({ text })}
                />
              </div>
            </div>
          )}
        </ItemList>
      );

    case "services":
      return (
        <ItemList
          items={section.cards}
          name="Card"
          limit={L.cards}
          addLabel="Add Card"
          newItem={() =>
            rowed({
              image: null,
              title: "",
              text: "",
              button: "",
              link: {
                kind: "search" as const,
                service: "car-with-driver" as const,
                mode: "oneway" as const,
              },
            })
          }
          onChange={(cards) => onChange({ ...section, cards })}
        >
          {(card, update) => {
            const note = targetNoteOf(card.link, data.choices);
            return (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_1fr]">
                <div>
                  <p className="mb-1.5 text-sm font-medium text-body">
                    Photo{" "}
                    <span className="font-normal text-muted">· optional</span>
                  </p>
                  <ImageField
                    label="Card photo"
                    size={IMAGE_SIZES.card}
                    image={card.image}
                    onChange={(image) => update({ image })}
                  />
                  <p className="mt-1.5 text-xs text-muted">
                    Without one, the card shows the photo of the page it leads
                    to.
                  </p>
                </div>
                <div className="grid content-start gap-3">
                  <Line
                    label="Title"
                    value={card.title}
                    limit={L.cardTitle}
                    placeholder="Airport Transfer"
                    onChange={(title) => update({ title })}
                  />
                  <Line
                    label="Line"
                    value={card.text}
                    limit={L.cardText}
                    onChange={(text) => update({ text })}
                  />
                  <Line
                    label="Button"
                    value={card.button}
                    limit={L.cardButton}
                    placeholder="Book a Transfer"
                    onChange={(button) => update({ button })}
                    hint="Optional. Without words, the card shows an arrow."
                  />
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-body">
                      Leads To
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <LinkTargetFields
                        kinds={SERVICE_CARD_LINK_KINDS}
                        target={card.link}
                        choices={data.choices}
                        onChange={(link) => update({ link })}
                      />
                    </div>
                    {note ? (
                      <p className="mt-1.5 text-xs text-warning">{note}</p>
                    ) : card.link.kind === "search" ? (
                      <p className="mt-1.5 text-xs text-muted">
                        Opens the service&apos;s page with its search card set
                        to that kind of trip.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          }}
        </ItemList>
      );

    case "vehicles":
      return (
        <VehiclePicker
          classIds={section.classIds}
          classes={data.classes}
          category={data.classCategory}
          onChange={(classIds) => onChange({ ...section, classIds })}
        />
      );

    case "steps":
      return (
        <ItemList
          items={section.steps}
          name="Step"
          limit={L.steps}
          addLabel="Add Step"
          newItem={() => rowed({ title: "", text: "" })}
          onChange={(steps) => onChange({ ...section, steps })}
        >
          {(step, update) => (
            <div className="grid gap-3">
              <Line
                label="Title"
                value={step.title}
                limit={L.stepTitle}
                placeholder="Choose Your Vehicle"
                onChange={(title) => update({ title })}
              />
              <Lines
                label="Line"
                value={step.text}
                limit={L.stepText}
                onChange={(text) => update({ text })}
              />
            </div>
          )}
        </ItemList>
      );

    case "trusted-by":
      return (
        <ItemList
          items={section.logos}
          name="Logo"
          limit={L.logos}
          addLabel="Add Logo"
          newItem={() => rowed({ image: null, name: "", link: "" })}
          onChange={(logos) => onChange({ ...section, logos })}
          actions={
            <CopyFrom
              section={section}
              others={data.others}
              onCopy={(copied) => onChange(copied)}
            />
          }
        >
          {(logo, update) => (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_1fr]">
              <ImageField
                label="Client's logo"
                size={IMAGE_SIZES.logo}
                look="logo"
                withAlt={false}
                image={logo.image}
                onChange={(image) => update({ image })}
              />
              <div className="grid content-start gap-3">
                <Line
                  label="Client's Name"
                  value={logo.name}
                  limit={L.logoName}
                  onChange={(name) => update({ name })}
                  hint="Also what a screen reader says for the logo."
                />
                <Field
                  label={
                    <Counted
                      label="Link"
                      value={logo.link.trim()}
                      limit={L.url}
                    />
                  }
                  hint={
                    logo.link.trim() !== "" && !isWebUrl(logo.link.trim()) ? (
                      <span className="text-danger">
                        Start the address with https://.
                      </span>
                    ) : (
                      "Optional: the client's site, opened in a new tab."
                    )
                  }
                >
                  <Input
                    autoComplete="off"
                    inputMode="url"
                    placeholder="https://…"
                    value={logo.link}
                    aria-invalid={
                      logo.link.trim() !== "" && !isWebUrl(logo.link.trim())
                    }
                    onChange={(event) => update({ link: event.target.value })}
                  />
                </Field>
              </div>
            </div>
          )}
        </ItemList>
      );

    case "testimonials":
      return (
        <ItemList
          items={section.quotes}
          name="Quote"
          limit={L.quotes}
          addLabel="Add Quote"
          newItem={() =>
            rowed({ quote: "", name: "", detail: "", image: null })
          }
          onChange={(quotes) => onChange({ ...section, quotes })}
          actions={
            <CopyFrom
              section={section}
              others={data.others}
              onCopy={(copied) => onChange(copied)}
            />
          }
        >
          {(quote, update) => (
            <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,12rem)]">
              <div className="grid content-start gap-3">
                <Lines
                  label="Words"
                  value={quote.quote}
                  limit={L.quote}
                  rows={4}
                  onChange={(words) => update({ quote: words })}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Line
                    label="Name"
                    value={quote.name}
                    limit={L.quoteName}
                    onChange={(name) => update({ name })}
                  />
                  <Line
                    label="Line Under the Name"
                    value={quote.detail}
                    limit={L.quoteDetail}
                    placeholder="Corporate client, Kuala Lumpur"
                    onChange={(detail) => update({ detail })}
                    hint="Optional."
                  />
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-sm font-medium text-body">
                  Photo{" "}
                  <span className="font-normal text-muted">· optional</span>
                </p>
                <ImageField
                  label="Client's photo"
                  size={IMAGE_SIZES.face}
                  withAlt={false}
                  image={quote.image}
                  onChange={(image) => update({ image })}
                />
              </div>
            </div>
          )}
        </ItemList>
      );

    case "news":
      return <NewsCount section={section} onChange={onChange} />;

    case "destinations":
    case "locations":
      return null;
  }
}

function NewsCount({
  section,
  onChange,
}: {
  section: FormSectionOf<"news">;
  onChange: (section: FormSection) => void;
}) {
  return (
    <Field label="How Many Posts" className="max-w-48">
      <Select
        value={String(section.count)}
        options={NEWS_COUNTS.map((count) => ({ value: count, label: count }))}
        onValueChange={(count) =>
          onChange({ ...section, count: Number(count) })
        }
      />
    </Field>
  );
}
