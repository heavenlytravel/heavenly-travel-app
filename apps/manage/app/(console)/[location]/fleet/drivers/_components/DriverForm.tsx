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
} from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { Checkbox, Field, FieldGroup, Input, Textarea } from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";
import { Select } from "@repo/ui/select";
import Link from "next/link";
import { Card, CardTitle } from "@repo/console/Card";
import { FormError } from "@repo/console/FormError";
import { DetailColumns } from "@repo/console/PageColumn";
import { ExpiryDateField } from "../../../../../_components/ExpiryDateField";
import { DATES_CARDS, SCOPE_FIELD } from "../../../../../_lib/fleet-form";
import { ALL, driversHref, type ScopeSlug } from "../../../../../_lib/routes";
import { useActionForm } from "../../../../../_lib/use-action-form";
import { createDriverAction, updateDriverAction } from "../actions";

/**
 * The form for one of our drivers, new or existing, across the record's
 * page: who they are and how to reach them, where they are based, notes
 * and whether they are active, the classes they may drive, and beside
 * them the expiry dates of their licences. Saved, it opens the drivers of
 * the scope it was opened in: every location's under `~`, else the
 * location they are based at.
 */
export function DriverForm({
  driver,
  scope,
  locationId,
  classes,
  locations,
}: {
  /** Absent on the "new" page. */
  driver?: DriverWithClasses;
  /** The scope the form is open in, which Cancel and a save go back to. */
  scope: ScopeSlug;
  /** Where a new driver is based to start with: the location under a slug. */
  locationId?: string;
  /** Every class in the catalogue, in its order. */
  classes: ClassOption[];
  locations: readonly LocationName[];
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
    <form {...formProps} className="grid gap-5">
      {driver ? <input type="hidden" name="id" value={driver.id} /> : null}
      <input type="hidden" name={SCOPE_FIELD} value={scope ?? ALL} />

      <DetailColumns
        main={
          <>
            <Card>
              <CardTitle>Details</CardTitle>
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
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

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" pending={pending}>
          {pending ? "Saving…" : isNew ? "Add driver" : "Save"}
        </Button>
        <Link
          href={driversHref(scope)}
          className="text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          Cancel
        </Link>
        <FormError error={error} />
      </div>
      {leaveDialog}
    </form>
  );
}
