"use client";

import {
  DRIVER_CLASSES_FIELD,
  DRIVER_DOCUMENTS,
  DRIVER_DOCUMENT_LABELS,
  DRIVER_FIELD_LABELS,
  DRIVER_LIMITS,
  TRIP_CATEGORIES,
  TRIP_CATEGORY_LABELS,
  driverFieldsOf,
} from "@repo/db";
import type {
  ClassOption,
  DriverWithClasses,
  HeldBooking,
  LocationName,
  VendorOption,
} from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { Checkbox, Field, FieldGroup, Input, Textarea } from "@repo/ui/field";
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
 * The form for a vendor's driver, new or existing, across the record's
 * page: whose driver they are, who they are and how to reach them, the
 * email they sign in to Connect with, where they are based, notes and
 * whether they are active, the classes they may drive, and beside them
 * the expiry dates of their licences. One copy for both apps: the admin
 * chooses the vendor from every one, and Connect fixes it to the
 * member's vendor, with only the locations it serves and the classes on
 * sale at them.
 */
export function DriverForm({
  driver,
  scope,
  locationId,
  vendorId,
  vendors,
  classes,
  locations,
  action,
  cancelHref,
  held = [],
}: {
  /** Absent on the "new" page. */
  driver?: DriverWithClasses;
  /** The admin's scope the form is open in (a slug, or `~`), which a save goes back to; absent in Connect. */
  scope?: string;
  /** Where a new driver is based to start with. */
  locationId?: string;
  /** Whose a new driver is to start with; ours when absent. */
  vendorId?: string;
  /** The vendors to choose from, in the admin; absent in Connect, where it is the member's. */
  vendors?: readonly VendorOption[];
  /** Every class they may be allowed on, in the catalogue's order. */
  classes: ClassOption[];
  locations: readonly LocationName[];
  /** The save, new or existing, as the app checks it. */
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  /** Where Cancel goes. */
  cancelHref: string;
  /** The accepted bookings still to come they are on, which making them inactive takes them off. */
  held?: readonly HeldBooking[];
}) {
  const isNew = !driver;
  const outOfService = useOutOfServiceAsk({
    name: driver?.name ?? "",
    wasActive: driver?.isActive ?? false,
    held,
    action: "Make inactive",
  });
  const { pending, error, formProps, leaveDialog } = useActionForm(action, {
    ask: outOfService.ask,
    done: isNew ? "Driver added." : "Driver saved.",
    leave: isNew
      ? "The driver is not added."
      : "The changes to this driver are lost.",
  });
  const fields = driver ? driverFieldsOf(driver) : null;
  const ticked = new Set(fields?.vehicleClassIds ?? []);
  const vendor = fields?.vendorId || vendorId || "";

  return (
    <form {...formProps} className="grid gap-5">
      {driver ? <input type="hidden" name="id" value={driver.id} /> : null}
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
                      what="driver"
                    />
                  ) : (
                    <input type="hidden" name="vendorId" value={vendor} />
                  )}
                  <Field label={DRIVER_FIELD_LABELS.name}>
                    <Input
                      name="name"
                      required
                      autoComplete="off"
                      maxLength={DRIVER_LIMITS.name}
                      defaultValue={fields?.name}
                    />
                  </Field>
                  <Field
                    label={DRIVER_FIELD_LABELS.phone}
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
                    label={DRIVER_FIELD_LABELS.email}
                    hint="The email they sign in to Connect with, to see and report their jobs."
                  >
                    <Input
                      name="email"
                      type="email"
                      autoComplete="off"
                      placeholder="ali@example.com"
                      defaultValue={fields?.email ?? ""}
                    />
                  </Field>
                  <Field
                    label={DRIVER_FIELD_LABELS.locationId}
                    tip="To move a driver to another location, change where they are based."
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
                <Field label={DRIVER_FIELD_LABELS.notes}>
                  <Textarea
                    name="notes"
                    rows={3}
                    maxLength={DRIVER_LIMITS.notes}
                    placeholder="Languages, the vehicle they usually drive, anything the team should know"
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
                    {DRIVER_FIELD_LABELS.isActive}
                  </label>
                  <InfoTip text="Inactive, the driver keeps their history and their licences are not checked." />
                </span>
              </div>
            </Card>

            <Card>
              <CardTitle>
                <span className="inline-flex items-center gap-1.5">
                  {DRIVER_FIELD_LABELS.vehicleClassIds}
                  <InfoTip text="The classes they are licensed and trusted to drive. A coach driver is not a sedan driver." />
                </span>
              </CardTitle>
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                {TRIP_CATEGORIES.map((category) => {
                  const ofCategory = classes.filter(
                    (c) => c.category === category,
                  );
                  if (ofCategory.length === 0) return null;
                  return (
                    <fieldset
                      key={category}
                      className="grid content-start gap-2"
                    >
                      <legend className="mb-1 text-sm font-semibold text-ink">
                        {TRIP_CATEGORY_LABELS[category]}
                      </legend>
                      {ofCategory.map((c) => (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Checkbox
                            name={DRIVER_CLASSES_FIELD}
                            value={c.id}
                            defaultChecked={ticked.has(c.id)}
                          />
                          {c.name}
                        </label>
                      ))}
                    </fieldset>
                  );
                })}
              </FieldGroup>
            </Card>
          </>
        }
        side={
          <Card id={DATES_CARDS.drivers.id}>
            <CardTitle>
              <span className="inline-flex items-center gap-1.5">
                {DATES_CARDS.drivers.name}
                <InfoTip text="The expiry dates of their driving licence and of the PSV licence that lets them drive paying passengers. A date within 30 days shows as due." />
              </span>
            </CardTitle>
            <div className="grid gap-4">
              {DRIVER_DOCUMENTS.map((key) => (
                <ExpiryDateField
                  key={key}
                  name={key}
                  label={DRIVER_DOCUMENT_LABELS[key]}
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
            {pending ? "Saving…" : isNew ? "Add driver" : "Save"}
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
