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
import type { VendorWithLocations } from "@repo/db/server";
import {
  Checkbox,
  Field,
  FieldGroup,
  Input,
  Radio,
  Textarea,
} from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";
import { Card, CardTitle } from "./Card";

/**
 * A vendor's fields, one copy for the admin's vendor form and Connect's
 * registration: company or individual, its name and registration, who
 * the team speaks to, what it offers, and the locations it serves, where
 * its vehicles and drivers are based. In Connect the email is the
 * account's (`emailFixed`) and only live locations are offered. See
 * docs/261028-fulfilment-vendors-and-connect.md, "Signing up".
 */
export function VendorFieldsSection({
  vendor,
  locations,
  emailFixed,
}: {
  /** Absent for a new vendor. */
  vendor?: VendorWithLocations;
  locations: readonly { id: string; name: string }[];
  /** The account's email, shown and sent but not typed. */
  emailFixed?: string;
}) {
  const fields = vendor ? vendorFieldsOf(vendor) : null;
  const services = new Set<string>(fields?.services ?? []);
  const served = new Set(fields?.locationIds ?? []);

  return (
    <>
      <Card>
        <CardTitle>Details</CardTitle>
        <div className="grid gap-4">
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-semibold text-ink">
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
            <Field
              label={VENDOR_FIELD_LABELS.contactEmail}
              hint={
                emailFixed
                  ? "Your account's email: where we write to you."
                  : undefined
              }
            >
              <Input
                name="contactEmail"
                type="email"
                required
                autoComplete="off"
                readOnly={emailFixed !== undefined}
                defaultValue={emailFixed ?? fields?.contactEmail}
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
        </div>
      </Card>

      <Card>
        <CardTitle>
          <span className="inline-flex items-center gap-1.5">
            {VENDOR_FIELD_LABELS.services}
            <InfoTip text="Only transport is assigned for now; the rest keeps a list of suppliers for Reservation." />
          </span>
        </CardTitle>
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

      <Card>
        <CardTitle>
          <span className="inline-flex items-center gap-1.5">
            {VENDOR_FIELD_LABELS.locationIds}
            <InfoTip text="Each of its vehicles and drivers is based at one of these." />
          </span>
        </CardTitle>
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
    </>
  );
}
