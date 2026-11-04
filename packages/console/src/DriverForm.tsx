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
import { Checkbox, Field, FieldGroup, Input } from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";
import type { ActionState } from "./action-state";
import { BankCard } from "./BankCard";
import { Card, CardTitle } from "./Card";
import { ExpiryDateField } from "./ExpiryDateField";
import { DATES_CARDS } from "./fleet-form";
import { PersonForm } from "./PersonForm";
import { SignInFields } from "./SignInFields";

/**
 * The form for a vendor's driver, new or existing (./PersonForm): the
 * email they sign in to Connect with (typed twice, with an optional
 * password, until saved, then locked: it changes with their account's,
 * in Manage), the classes they may drive, and beside them the expiry
 * dates of their licences and where they are paid. In Connect, only the
 * classes on sale at the vendor's locations.
 */
export function DriverForm({
  driver,
  classes,
  held = [],
  ...shared
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
  const fields = driver ? driverFieldsOf(driver) : null;
  const ticked = new Set(fields?.vehicleClassIds ?? []);
  const savedEmail = fields?.email ?? null;

  return (
    <PersonForm
      {...shared}
      noun="driver"
      record={driver}
      fields={fields}
      labels={DRIVER_FIELD_LABELS}
      limits={DRIVER_LIMITS}
      held={held}
      notesPlaceholder="Languages, the vehicle they usually drive, anything the team should know"
      activeTip="Inactive, the driver keeps their history and their licences are not checked."
      email={
        savedEmail ? (
          <Field
            label={DRIVER_FIELD_LABELS.email}
            hint={
              driver?.userId
                ? shared.scope
                  ? "They sign in to Connect with it. To change it, open their account under Users."
                  : "They sign in to Connect with it. To change it, contact us."
                : "No account yet: saving gives them one, to sign in to Connect with."
            }
          >
            <Input name="email" type="email" readOnly value={savedEmail} />
          </Field>
        ) : (
          <>
            <Field
              label={DRIVER_FIELD_LABELS.email}
              hint="Optional. Saving gives them an account with it, to sign in to Connect and see their jobs."
            >
              <Input
                name="email"
                type="email"
                autoComplete="off"
                placeholder="ali@example.com"
              />
            </Field>
            <SignInFields required={false} placeholder="ali@example.com" />
          </>
        )
      }
      more={
        <Card>
          <CardTitle>
            <span className="inline-flex items-center gap-1.5">
              {DRIVER_FIELD_LABELS.vehicleClassIds}
              <InfoTip text="The classes they are licensed and trusted to drive. A coach driver is not a sedan driver." />
            </span>
          </CardTitle>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            {TRIP_CATEGORIES.map((category) => {
              const ofCategory = classes.filter((c) => c.category === category);
              if (ofCategory.length === 0) return null;
              return (
                <fieldset key={category} className="grid content-start gap-2">
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
      }
      side={
        <>
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
          <BankCard fields={fields ?? undefined} whose="the driver" payee />
        </>
      }
    />
  );
}
