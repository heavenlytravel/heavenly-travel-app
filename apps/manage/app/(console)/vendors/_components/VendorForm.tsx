"use client";

import {
  VENDOR_FIELD_LABELS,
  VENDOR_KINDS,
  VENDOR_KIND_LABELS,
  VENDOR_LIMITS,
  VENDOR_LOCATIONS_FIELD,
  VENDOR_SERVICES,
  VENDOR_SERVICES_FIELD,
  VENDOR_SERVICE_LABELS,
  vendorFieldsOf,
} from "@repo/db";
import type { LocationName, VendorWithLocations } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import {
  Checkbox,
  Field,
  FieldGroup,
  Input,
  Radio,
  Textarea,
} from "@repo/ui/field";
import Link from "next/link";
import { Card } from "@repo/console/Card";
import { FormError } from "@repo/console/FormError";
import { FORM_WIDTH } from "@repo/console/PageColumn";
import { useActionForm } from "@repo/console/use-action-form";
import { createVendorAction, updateVendorAction } from "../actions";

/**
 * The form for a vendor, new or existing: company or individual, its name
 * and registration, who the team speaks to, what it offers, and the
 * locations it serves, where its vehicles and drivers are based. Connect's
 * registration asks the same. A new one opens its page once saved.
 */
export function VendorForm({
  vendor,
  locations,
  backHref,
}: {
  /** Absent on the "new" page. */
  vendor?: VendorWithLocations;
  locations: LocationName[];
  backHref: string;
}) {
  const isNew = !vendor;
  const { pending, error, formProps, leaveDialog } = useActionForm(
    isNew ? createVendorAction : updateVendorAction,
    {
      done: isNew ? "Vendor added." : "Vendor saved.",
      leave: isNew
        ? "The vendor is not added."
        : "The changes to this vendor are lost.",
    },
  );
  const fields = vendor ? vendorFieldsOf(vendor) : null;
  const services = new Set<string>(fields?.services ?? []);
  const served = new Set(fields?.locationIds ?? []);

  return (
    <form {...formProps} className={`grid gap-6 ${FORM_WIDTH}`}>
      {vendor ? <input type="hidden" name="id" value={vendor.id} /> : null}

      <Card className="grid gap-4">
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium text-slate-800">
            {VENDOR_FIELD_LABELS.kind}
          </legend>
          <div className="flex flex-wrap gap-4">
            {VENDOR_KINDS.map((kind) => (
              <label key={kind} className="flex items-center gap-2 text-sm">
                <Radio
                  name="kind"
                  value={kind}
                  required
                  defaultChecked={(fields?.kind ?? "company") === kind}
                />
                {VENDOR_KIND_LABELS[kind]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={VENDOR_FIELD_LABELS.name}
            hint="The company's registered name, or the person's full name."
          >
            <Input
              name="name"
              required
              autoComplete="off"
              maxLength={VENDOR_LIMITS.name}
              defaultValue={fields?.name}
            />
          </Field>
          <Field
            label={VENDOR_FIELD_LABELS.registrationNo}
            hint="The SSM number of a company, the IC of an individual."
          >
            <Input
              name="registrationNo"
              autoComplete="off"
              maxLength={VENDOR_LIMITS.registrationNo}
              defaultValue={fields?.registrationNo}
            />
          </Field>
          <Field label={VENDOR_FIELD_LABELS.contactName}>
            <Input
              name="contactName"
              required
              autoComplete="off"
              maxLength={VENDOR_LIMITS.contactName}
              defaultValue={fields?.contactName}
            />
          </Field>
          <Field
            label={VENDOR_FIELD_LABELS.contactPhone}
            hint="Their WhatsApp, with the country code."
          >
            <Input
              name="contactPhone"
              type="tel"
              required
              autoComplete="off"
              placeholder="+60 12-345 6789"
              defaultValue={fields?.contactPhone}
            />
          </Field>
          <Field label={VENDOR_FIELD_LABELS.contactEmail}>
            <Input
              name="contactEmail"
              type="email"
              required
              autoComplete="off"
              defaultValue={fields?.contactEmail}
            />
          </Field>
          <Field label={VENDOR_FIELD_LABELS.address}>
            <Textarea
              name="address"
              rows={2}
              maxLength={VENDOR_LIMITS.address}
              defaultValue={fields?.address}
            />
          </Field>
        </div>
      </Card>

      <Card className="grid gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {VENDOR_FIELD_LABELS.services}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Only transport is assigned for now; the rest keeps a list of
            suppliers for Reservation.
          </p>
        </div>
        <FieldGroup className="grid gap-2 sm:grid-cols-3">
          {VENDOR_SERVICES.map((service) => (
            <label key={service} className="flex items-center gap-2 text-sm">
              <Checkbox
                name={VENDOR_SERVICES_FIELD}
                value={service}
                defaultChecked={services.has(service)}
              />
              {VENDOR_SERVICE_LABELS[service]}
            </label>
          ))}
        </FieldGroup>
      </Card>

      <Card className="grid gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {VENDOR_FIELD_LABELS.locationIds}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Each of its vehicles and drivers is based at one of these.
          </p>
        </div>
        <FieldGroup className="grid gap-2 sm:grid-cols-3">
          {locations.map((location) => (
            <label
              key={location.id}
              className="flex items-center gap-2 text-sm"
            >
              <Checkbox
                name={VENDOR_LOCATIONS_FIELD}
                value={location.id}
                defaultChecked={served.has(location.id)}
              />
              {location.name}
            </label>
          ))}
        </FieldGroup>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isNew ? "Add vendor" : "Save"}
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
