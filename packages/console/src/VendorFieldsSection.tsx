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
  type VendorFields,
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
import { useState } from "react";
import { BankCard } from "./BankCard";
import { Card, CardTitle } from "./Card";

/**
 * A vendor's fields, one copy for the admin's vendor form and Connect's
 * registration: company or individual, its name and registration, who
 * the team speaks to, what it offers, and
 * the locations it serves, where its vehicles and drivers are based. In Connect's registration
 * (`applicant`) the person is asked for apart, as the account's owner,
 * so the contact's fields are left out, and only live locations are
 * offered. See docs/261030-sign-in-connect-onboarding-and-media.md,
 * "Connect".
 */
export function VendorFieldsSection({
  vendor,
  locations,
  applicant = false,
}: {
  /** Absent for a new vendor. */
  vendor?: VendorWithLocations;
  locations: readonly { id: string; name: string }[];
  /** Connect's registration: the business alone, the contact asked for apart. */
  applicant?: boolean;
}) {
  const fields = vendor ? vendorFieldsOf(vendor) : null;
  const service = fields?.services[0];
  const served = new Set(fields?.locationIds ?? []);

  return (
    <>
      <Card>
        <CardTitle>{applicant ? "Your business" : "Details"}</CardTitle>
        <VendorDetailsFields fields={fields} applicant={applicant} />
      </Card>

      <Card>
        <CardTitle>
          <span className="inline-flex items-center gap-1.5">
            {VENDOR_FIELD_LABELS.services}
            <InfoTip text="One choice. Vehicles, drivers and tour guides are assigned work; attractions and accommodation keep a list of suppliers for Reservation." />
          </span>
        </CardTitle>
        <FieldGroup className="grid gap-2 sm:grid-cols-3">
          {VENDOR_SERVICES.map((value) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <Radio
                name={VENDOR_SERVICES_FIELD}
                value={value}
                required
                defaultChecked={service === value}
              />
              {VENDOR_SERVICE_LABELS[value]}
            </label>
          ))}
        </FieldGroup>
        {applicant ? (
          <p className="mt-3 text-xs text-muted">
            Once you are approved, only the team changes it.
          </p>
        ) : vendor ? (
          <p className="mt-3 text-xs text-muted">
            To change it, first remove the vehicles, drivers or tour guides the
            new choice does not cover.
          </p>
        ) : null}
      </Card>

      <Card>
        <CardTitle>
          <span className="inline-flex items-center gap-1.5">
            {VENDOR_FIELD_LABELS.locationIds}
            <InfoTip text="Each of its vehicles and drivers is based at one of these." />
          </span>
        </CardTitle>
        <VendorLocationChecks locations={locations} served={served} />
      </Card>

      {/* Not asked at registration: the owner adds them under Business once approved. */}
      {applicant ? null : (
        <BankCard
          fields={fields ?? undefined}
          whose="the vendor for its vehicles"
        />
      )}
    </>
  );
}

/**
 * Who the vendor is and who the team speaks to: company or individual, its
 * name and registration, the contact's name, phone and email, and its
 * address. An individual is asked their own name and IC, if they wish,
 * and no contact person: they are their own. Connect's registration
 * (`applicant`) asks for the person apart.
 */
export function VendorDetailsFields({
  fields,
  applicant = false,
}: {
  fields: VendorFields | null;
  applicant?: boolean;
}) {
  const [kind, setKind] = useState(fields?.kind ?? "company");
  const individual = kind === "individual";
  return (
    <div className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-semibold text-ink">
          {VENDOR_FIELD_LABELS.kind}
        </legend>
        <div className="flex flex-wrap gap-4">
          {VENDOR_KINDS.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm">
              <Radio
                name="kind"
                value={option}
                required
                checked={kind === option}
                onChange={() => setKind(option)}
              />
              {VENDOR_KIND_LABELS[option]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={individual ? "Full name" : VENDOR_FIELD_LABELS.name}
          hint={individual ? "As on the IC." : "The company's registered name."}
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
          label={individual ? "IC number (optional)" : "SSM number"}
          hint={
            individual
              ? "Helps the team check who you are."
              : "The company's registration number."
          }
        >
          <Input
            name="registrationNo"
            autoComplete="off"
            maxLength={VENDOR_LIMITS.registrationNo}
            defaultValue={fields?.registrationNo}
          />
        </Field>
        {applicant ? null : (
          <>
            {individual ? null : (
              <Field label={VENDOR_FIELD_LABELS.contactName}>
                <Input
                  name="contactName"
                  required
                  autoComplete="off"
                  maxLength={VENDOR_LIMITS.contactName}
                  defaultValue={fields?.contactName}
                />
              </Field>
            )}
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
          </>
        )}
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
  );
}

/** The locations a vendor serves, a box each; `served` ticked. */
export function VendorLocationChecks({
  locations,
  served,
}: {
  locations: readonly { id: string; name: string }[];
  served: ReadonlySet<string>;
}) {
  return (
    <FieldGroup className="grid gap-2 sm:grid-cols-3">
      {locations.map((location) => (
        <label key={location.id} className="flex items-center gap-2 text-sm">
          <Checkbox
            name={VENDOR_LOCATIONS_FIELD}
            value={location.id}
            defaultChecked={served.has(location.id)}
          />
          {location.name}
        </label>
      ))}
    </FieldGroup>
  );
}
