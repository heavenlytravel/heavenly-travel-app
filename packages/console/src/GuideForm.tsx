"use client";

import {
  GUIDE_DOCUMENTS,
  GUIDE_DOCUMENT_LABELS,
  GUIDE_FIELD_LABELS,
  GUIDE_LANGUAGES_FIELD,
  GUIDE_LIMITS,
  guideFieldsOf,
} from "@repo/db";
import type {
  GuideWithVendor,
  HeldBooking,
  LocationName,
  VendorOption,
} from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { Checkbox, Field, Input, Textarea } from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";
import { Select } from "@repo/ui/select";
import type { ActionState } from "./action-state";
import { Card, CardTitle } from "./Card";
import { ExpiryDateField } from "./ExpiryDateField";
import { DATES_CARDS, SCOPE_FIELD } from "./fleet-form";
import { FormFoot } from "./FormFoot";
import { DetailColumns } from "./PageColumn";
import { useActionForm } from "./use-action-form";
import { useOutOfServiceAsk } from "./use-out-of-service-ask";
import { VendorField } from "./VendorField";

/**
 * The form for a vendor's tour guide, new or existing, across the
 * record's page: whose guide they are, who they are and how to reach
 * them, the languages they guide in, where they are based, notes and
 * whether they are active, and beside them the expiry of their MOTAC
 * licence. A guide has no account: their vendor accepts for them. One
 * copy for both apps: the admin chooses the vendor from every one, and
 * Connect fixes it to the member's vendor, with only the locations it
 * serves. See docs/261103-tour-guide.md.
 */
export function GuideForm({
  guide,
  scope,
  locationId,
  vendorId,
  vendors,
  locations,
  action,
  cancelHref,
  held = [],
}: {
  /** Absent on the "new" page. */
  guide?: GuideWithVendor;
  /** The admin's scope the form is open in (a slug, or `~`), which a save goes back to; absent in Connect. */
  scope?: string;
  /** Where a new guide is based to start with. */
  locationId?: string;
  /** Whose a new guide is to start with; ours when absent. */
  vendorId?: string;
  /** The vendors to choose from, in the admin; absent in Connect, where it is the member's. */
  vendors?: readonly VendorOption[];
  locations: readonly LocationName[];
  /** The save, new or existing, as the app checks it. */
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  /** Where Cancel goes. */
  cancelHref: string;
  /** The accepted bookings still to come they are on, which making them inactive takes them off. */
  held?: readonly HeldBooking[];
}) {
  const isNew = !guide;
  const outOfService = useOutOfServiceAsk({
    name: guide?.name ?? "",
    wasActive: guide?.isActive ?? false,
    held,
    action: "Make inactive",
  });
  const { pending, error, formProps, leaveDialog } = useActionForm(action, {
    ask: outOfService.ask,
    done: isNew ? "Tour guide added." : "Tour guide saved.",
    leave: isNew
      ? "The tour guide is not added."
      : "The changes to this tour guide are lost.",
  });
  const fields = guide ? guideFieldsOf(guide) : null;
  const vendor = fields?.vendorId || vendorId || "";

  return (
    <form {...formProps} className="grid gap-5">
      {guide ? <input type="hidden" name="id" value={guide.id} /> : null}
      {scope ? <input type="hidden" name={SCOPE_FIELD} value={scope} /> : null}

      <DetailColumns
        main={
          <Card>
            <CardTitle>Details</CardTitle>
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {vendors ? (
                  <VendorField
                    vendors={vendors}
                    defaultValue={vendor}
                    what="guide"
                  />
                ) : (
                  <input type="hidden" name="vendorId" value={vendor} />
                )}
                <Field label={GUIDE_FIELD_LABELS.name}>
                  <Input
                    name="name"
                    required
                    autoComplete="off"
                    maxLength={GUIDE_LIMITS.name}
                    defaultValue={fields?.name}
                  />
                </Field>
                <Field
                  label={GUIDE_FIELD_LABELS.phone}
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
                <Field
                  label={GUIDE_FIELD_LABELS.languages}
                  hint="Separated by commas."
                >
                  <Input
                    name={GUIDE_LANGUAGES_FIELD}
                    required
                    autoComplete="off"
                    placeholder="English, Mandarin"
                    defaultValue={fields?.languages.join(", ")}
                  />
                </Field>
                <Field
                  label={GUIDE_FIELD_LABELS.locationId}
                  tip="To move a tour guide to another location, change where they are based."
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
              <Field label={GUIDE_FIELD_LABELS.notes}>
                <Textarea
                  name="notes"
                  rows={3}
                  maxLength={GUIDE_LIMITS.notes}
                  placeholder="The places they know best, anything the team should know"
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
                  {GUIDE_FIELD_LABELS.isActive}
                </label>
                <InfoTip text="Inactive, the tour guide keeps their history and their licence is not checked." />
              </span>
            </div>
          </Card>
        }
        side={
          <Card id={DATES_CARDS.guides.id}>
            <CardTitle>
              <span className="inline-flex items-center gap-1.5">
                {DATES_CARDS.guides.name}
                <InfoTip text="The expiry date of their tourist guide licence from MOTAC. A date within 30 days shows as due." />
              </span>
            </CardTitle>
            <div className="grid gap-4">
              {GUIDE_DOCUMENTS.map((key) => (
                <ExpiryDateField
                  key={key}
                  name={key}
                  label={GUIDE_DOCUMENT_LABELS[key]}
                  defaultValue={fields?.[key] ?? null}
                />
              ))}
            </div>
          </Card>
        }
      />

      <FormFoot
        submit={
          <Button type="submit" pending={pending}>
            {pending ? "Saving…" : isNew ? "Add tour guide" : "Save"}
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
