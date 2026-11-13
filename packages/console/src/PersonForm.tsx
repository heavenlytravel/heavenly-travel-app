"use client";

import { sentenceCase, titleCase } from "@repo/db";
import type { HeldBooking, LocationName, VendorOption } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { Checkbox, Field, Input, Textarea } from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";
import { Select } from "@repo/ui/select";
import type { ReactNode } from "react";
import type { ActionState } from "./action-state";
import { Card, CardTitle } from "./Card";
import { SCOPE_FIELD } from "./fleet-form";
import { FormFoot } from "./FormFoot";
import { DetailColumns } from "./PageColumn";
import { useActionForm } from "./use-action-form";
import { useOutOfServiceAsk } from "./use-out-of-service-ask";
import { VendorField } from "./VendorField";

/** What every person of a vendor's fleet has, as their form fills it in. */
type PersonFields = {
  vendorId: string;
  name: string;
  phone: string;
  locationId: string;
  notes: string;
  isActive: boolean;
};

/**
 * The form a vendor's people share, a driver's and a tour guide's, across
 * the record's page: whose they are, who they are and how to reach them,
 * their email (the form's own, in `email`), where they are based, notes
 * and whether they are active, which asks first when it takes them off
 * accepted bookings; then the form's own cards, under the details
 * (`more`) and beside them (`side`). One copy for both apps: the admin
 * chooses the vendor from every one, and Connect fixes it to the
 * member's vendor, with only the locations it serves.
 */
export function PersonForm({
  noun,
  record,
  fields,
  labels,
  limits,
  scope,
  locationId,
  vendorId,
  vendors,
  locations,
  email,
  notesPlaceholder,
  activeTip,
  more,
  side,
  action,
  cancelHref,
  held,
}: {
  /** "driver", "tour guide": in its messages and buttons. */
  noun: string;
  /** The saved record; absent on the "new" page. */
  record?: { id: string; name: string; isActive: boolean };
  fields: PersonFields | null;
  labels: Record<keyof PersonFields, string>;
  limits: { name: number; notes: number };
  /** The admin's scope the form is open in (a slug, or `~`), which a save goes back to; absent in Connect. */
  scope?: string;
  /** Where a new one is based to start with. */
  locationId?: string;
  /** Whose a new one is to start with; ours when absent. */
  vendorId?: string;
  /** The vendors to choose from, in the admin; absent in Connect, where it is the member's. */
  vendors?: readonly VendorOption[];
  locations: readonly LocationName[];
  /** The email's fields, after the phone. */
  email: ReactNode;
  notesPlaceholder: string;
  /** What being inactive means for them. */
  activeTip: string;
  more?: ReactNode;
  side: ReactNode;
  /** The save, new or existing, as the app checks it. */
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  cancelHref: string;
  /** The accepted bookings still to come they are on, which making them inactive takes them off. */
  held: readonly HeldBooking[];
}) {
  const isNew = !record;
  const Noun = sentenceCase(noun);
  const outOfService = useOutOfServiceAsk({
    name: record?.name ?? "",
    wasActive: record?.isActive ?? false,
    held,
    action: "Make Inactive",
  });
  const { pending, error, formProps, leaveDialog } = useActionForm(action, {
    ask: outOfService.ask,
    done: isNew ? `${Noun} added.` : `${Noun} saved.`,
    leave: isNew
      ? `The ${noun} is not added.`
      : `The changes to this ${noun} are lost.`,
  });
  const vendor = fields?.vendorId || vendorId || "";

  return (
    <form {...formProps} className="grid gap-5">
      {record ? <input type="hidden" name="id" value={record.id} /> : null}
      {scope ? <input type="hidden" name={SCOPE_FIELD} value={scope} /> : null}

      <DetailColumns
        main={
          <>
            <Card>
              <CardTitle>Details</CardTitle>
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {vendors ? (
                    <VendorField
                      vendors={vendors}
                      defaultValue={vendor}
                      what={noun}
                    />
                  ) : (
                    <input type="hidden" name="vendorId" value={vendor} />
                  )}
                  <Field label={labels.name}>
                    <Input
                      name="name"
                      required
                      autoComplete="off"
                      maxLength={limits.name}
                      defaultValue={fields?.name}
                    />
                  </Field>
                  <Field
                    label={labels.phone}
                    hint="Their WhatsApp, with the country code."
                  >
                    <Input
                      name="phone"
                      type="tel"
                      required
                      autoComplete="off"
                      placeholder="+60 12-345 6789"
                      defaultValue={fields?.phone}
                    />
                  </Field>
                  {email}
                  <Field
                    label={labels.locationId}
                    tip={`To move a ${noun} to another location, change where they are based.`}
                  >
                    <Select
                      name="locationId"
                      required
                      placeholder="Choose the location"
                      defaultValue={fields?.locationId ?? locationId ?? ""}
                      options={locations.map((location) => ({
                        value: location.id,
                        label: location.name,
                      }))}
                    />
                  </Field>
                </div>
                <Field label={labels.notes}>
                  <Textarea
                    name="notes"
                    rows={3}
                    maxLength={limits.notes}
                    placeholder={notesPlaceholder}
                    defaultValue={fields?.notes}
                  />
                </Field>
                {/* The tip beside the label, not in it: its button would join the box's name. */}
                <span className="flex items-center gap-1.5 text-sm">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      name="isActive"
                      defaultChecked={fields?.isActive ?? true}
                      onChange={(event) =>
                        outOfService.onActiveChange(event.currentTarget.checked)
                      }
                    />
                    {labels.isActive}
                  </label>
                  <InfoTip text={activeTip} />
                </span>
              </div>
            </Card>
            {more}
          </>
        }
        side={side}
      />

      <FormFoot
        submit={
          <Button type="submit" pending={pending}>
            {pending ? "Saving…" : isNew ? titleCase(`Add ${noun}`) : "Save"}
          </Button>
        }
        cancelHref={cancelHref}
        error={error}
      />
      {leaveDialog}
      {outOfService.dialog}
    </form>
  );
}
