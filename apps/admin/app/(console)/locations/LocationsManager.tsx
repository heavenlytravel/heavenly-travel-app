"use client";

import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Field, Input, Select } from "@repo/ui/field";
import { Switch } from "@repo/ui/switch";
import { useState } from "react";
import { PageHeader, PreviewNotice } from "../../_components/PageHeader";
import {
  LOCATION_TYPES,
  type AdminLocation,
  type LocationType,
} from "./sample-locations";

const TYPE_LABEL: Record<LocationType, string> = {
  airport: "Airport",
  city: "City",
};

const EMPTY: AdminLocation = {
  id: "",
  name: "",
  tag: "",
  type: "city",
  airportCode: "",
  isActive: true,
};

export function LocationsManager({
  initialLocations,
}: {
  initialLocations: AdminLocation[];
}) {
  const [locations, setLocations] = useState(initialLocations);
  /** The location in the form. An empty id means it is a new one. */
  const [draft, setDraft] = useState<AdminLocation | null>(null);

  function setActive(id: string, isActive: boolean) {
    setLocations((current) =>
      current.map((l) => (l.id === id ? { ...l, isActive } : l)),
    );
  }

  function save(location: AdminLocation) {
    setLocations((current) =>
      location.id
        ? current.map((l) => (l.id === location.id ? location : l))
        : [...current, { ...location, id: crypto.randomUUID() }],
    );
    setDraft(null);
  }

  return (
    <>
      <PageHeader
        title="Locations"
        description="Places customers can choose for pick-up and drop-off."
        action={<Button onClick={() => setDraft(EMPTY)}>Add location</Button>}
      />
      <PreviewNotice>
        Preview only. Changes stay in this browser tab and are lost on reload.
      </PreviewNotice>

      <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-xs text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Tag</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {locations.map((location) => (
              <tr
                key={location.id}
                className={location.isActive ? undefined : "text-neutral-400"}
              >
                <td className="px-4 py-3 font-medium">
                  {location.name}
                  {location.airportCode ? (
                    <span className="ml-2 text-xs font-normal text-neutral-500">
                      {location.airportCode}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">{location.tag}</td>
                <td className="px-4 py-3">
                  <Badge
                    tone={location.type === "airport" ? "blue" : "neutral"}
                  >
                    {TYPE_LABEL[location.type]}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Switch
                    checked={location.isActive}
                    onCheckedChange={(checked) =>
                      setActive(location.id, checked)
                    }
                    label={`${location.name} is active`}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDraft(location)}
                  >
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {draft ? (
        <LocationForm
          // Remount per location so the form state starts from that location.
          key={draft.id || "new"}
          location={draft}
          onSave={save}
          onCancel={() => setDraft(null)}
        />
      ) : null}
    </>
  );
}

function LocationForm({
  location,
  onSave,
  onCancel,
}: {
  location: AdminLocation;
  onSave: (location: AdminLocation) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(location);
  const isNew = !location.id;
  const isAirport = values.type === "airport";

  function set<K extends keyof AdminLocation>(key: K, value: AdminLocation[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <div
      className="fixed inset-0 z-10 flex justify-end bg-neutral-900/30"
      onClick={onCancel}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? "Add location" : `Edit ${location.name}`}
        className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
        }}
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            ...values,
            name: values.name.trim(),
            tag: values.tag.trim(),
            airportCode: isAirport ? values.airportCode.trim() : "",
          });
        }}
      >
        <h2 className="border-b border-neutral-200 px-6 py-5 text-lg font-semibold tracking-tight">
          {isNew ? "Add location" : `Edit ${location.name}`}
        </h2>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <Field label="Name">
            <Input
              required
              autoFocus
              value={values.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder="Langkawi"
            />
          </Field>
          <Field label="Tag" hint="Short line shown above the name.">
            <Input
              required
              value={values.tag}
              onChange={(event) => set("tag", event.target.value)}
              placeholder="Island escape"
            />
          </Field>
          <Field label="Type">
            <Select
              value={values.type}
              onChange={(event) =>
                set("type", event.target.value as LocationType)
              }
            >
              {LOCATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TYPE_LABEL[type]}
                </option>
              ))}
            </Select>
          </Field>
          {isAirport ? (
            <Field label="Airport code" hint="Three-letter IATA code.">
              <Input
                required
                value={values.airportCode}
                onChange={(event) =>
                  set("airportCode", event.target.value.toUpperCase())
                }
                pattern="[A-Z]{3}"
                maxLength={3}
                placeholder="KUL"
              />
            </Field>
          ) : null}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-800">Active</p>
              <p className="mt-0.5 text-xs text-neutral-500">
                Inactive locations are hidden from customers.
              </p>
            </div>
            <Switch
              checked={values.isActive}
              onCheckedChange={(checked) => set("isActive", checked)}
              label="Active"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-neutral-200 px-6 py-4">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{isNew ? "Add location" : "Save"}</Button>
        </div>
      </form>
    </div>
  );
}
