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
  LocationName,
  VendorOption,
} from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { Checkbox, Field, FieldGroup, Input, Textarea } from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";
import { Select } from "@repo/ui/select";
import Link from "next/link";
import { Card } from "../../../_components/Card";
import { ExpiryDateField } from "../../../_components/ExpiryDateField";
import { FormError } from "../../../_components/FormError";
import { VendorField } from "../../../_components/VendorField";
import { FLEET_BACK_FIELD } from "../../../_lib/routes";
import { useActionForm } from "../../../_lib/use-action-form";
import { createDriverAction, updateDriverAction } from "../actions";
import { FORM_WIDTH } from "../../../_components/PageColumn";

/**
 * The form for a vendor's driver, new or existing: whose driver they are,
 * who they are and how to reach them, the email they sign in to Connect
 * with, where they are based, the classes they may drive, the
 * expiry dates of their licences, and notes. A saved driver opens the
 * Drivers tab of the location they are based at, or the list across
 * locations they were added from.
 */
export function DriverForm({
  locationId,
  vendorId,
  driver,
  classes,
  locations,
  vendors,
  backHref,
  backToList = false,
}: {
  /** Where a new driver is based to start with; absent on the list across locations. */
  locationId?: string;
  /** Whose a new driver is to start with; ours when absent. */
  vendorId?: string;
  /** Absent on the "new" page. */
  driver?: DriverWithClasses;
  vendors: VendorOption[];
  /** Every class in the catalogue, in its order. */
  classes: ClassOption[];
  locations: LocationName[];
  /** Where "Cancel" goes; with `backToList`, where a saved driver goes too. */
  backHref: string;
  /** Opened from the list across locations, which a saved driver goes back to. */
  backToList?: boolean;
}) {
  const isNew = !driver;
  const { pending, error, formProps, leaveDialog } = useActionForm(
    isNew ? createDriverAction : updateDriverAction,
    {
      done: isNew ? "Driver added." : "Driver saved.",
      leave: isNew
        ? "The driver is not added."
        : "The changes to this driver are lost.",
    },
  );
  const fields = driver ? driverFieldsOf(driver) : null;
  const ticked = new Set(fields?.vehicleClassIds ?? []);

  return (
    <form {...formProps} className={`grid gap-6 ${FORM_WIDTH}`}>
      {driver ? <input type="hidden" name="id" value={driver.id} /> : null}
      {backToList ? (
        <input type="hidden" name={FLEET_BACK_FIELD} value={backHref} />
      ) : null}

      <Card className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <VendorField
            vendors={vendors}
            defaultValue={fields?.vendorId || vendorId || ""}
            what="driver"
          />
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
            label={
              <span className="inline-flex items-center gap-1.5">
                {DRIVER_FIELD_LABELS.locationId}
                <InfoTip text="To move a driver to another location, change where they are based." />
              </span>
            }
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
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="isActive" defaultChecked={fields?.isActive ?? true} />
          <span className="inline-flex items-center gap-1.5">
            {DRIVER_FIELD_LABELS.isActive}
            <InfoTip text="Inactive, the driver keeps their history and their licences are not checked." />
          </span>
        </label>
      </Card>

      <Card className="grid gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {DRIVER_FIELD_LABELS.vehicleClassIds}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            The classes they are licensed and trusted to drive. A coach driver
            is not a sedan driver.
          </p>
        </div>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          {TRIP_CATEGORIES.map((category) => {
            const ofCategory = classes.filter((c) => c.category === category);
            if (ofCategory.length === 0) return null;
            return (
              <fieldset key={category} className="grid content-start gap-2">
                <legend className="mb-1 text-sm font-medium text-slate-800">
                  {TRIP_CATEGORY_LABELS[category]}
                </legend>
                {ofCategory.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
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

      <Card className="grid gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Licences</h2>
          <p className="mt-1 text-sm text-slate-500">
            The expiry dates of their driving licence and of the PSV licence
            that lets them drive paying passengers. A date within 30 days shows
            as due.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
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

      <Card className="grid gap-4">
        <Field label={DRIVER_FIELD_LABELS.notes}>
          <Textarea
            name="notes"
            rows={3}
            maxLength={DRIVER_LIMITS.notes}
            placeholder="Languages, the vehicle they usually drive, anything the team should know"
            defaultValue={fields?.notes}
          />
        </Field>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isNew ? "Add driver" : "Save"}
        </Button>
        <Link
          href={backHref}
          className="text-sm text-slate-600 underline-offset-4 hover:underline"
        >
          Cancel
        </Link>
        <FormError error={error} />
      </div>
      {leaveDialog}
    </form>
  );
}
