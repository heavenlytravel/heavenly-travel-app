"use client";

import {
  GUIDE_DOCUMENTS,
  GUIDE_DOCUMENT_LABELS,
  GUIDE_FIELD_LABELS,
  GUIDE_LANGUAGES,
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
import { Checkbox, Field, FieldGroup, Input } from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";
import type { ActionState } from "./action-state";
import { BankCard } from "./BankCard";
import { Card, CardTitle } from "./Card";
import { ExpiryDateField } from "./ExpiryDateField";
import { PersonForm } from "./PersonForm";
import { ConfirmEmailField } from "./SignInFields";

/**
 * The form for a vendor's tour guide, new or existing (./PersonForm): the
 * languages they guide in, ticked from the list customers choose from,
 * the expiry of their MOTAC licence, kept, not watched, and where they
 * are paid. A guide has no account: their vendor accepts for them; one
 * who has a Connect account anyway is known by its email, typed twice,
 * and locked in Connect once saved: Manage changes it. See
 * docs/261103-tour-guide.md.
 */
export function GuideForm({
  guide,
  held = [],
  ...shared
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
  const fields = guide ? guideFieldsOf(guide) : null;
  const savedEmail = fields?.email ?? null;
  // In Connect (no vendors to choose from) a saved email is ours to change.
  const inConnect = !shared.vendors;
  // A new guide starts with English ticked.
  const speaks = new Set(fields?.languages ?? ["English"]);

  return (
    <PersonForm
      {...shared}
      noun="tour guide"
      record={guide}
      fields={fields}
      labels={GUIDE_FIELD_LABELS}
      limits={GUIDE_LIMITS}
      held={held}
      notesPlaceholder="The places they know best, anything the team should know"
      activeTip="Inactive, the tour guide keeps their history and is not offered for trips."
      email={
        inConnect && savedEmail ? (
          <Field
            label={GUIDE_FIELD_LABELS.email}
            hint="It shows their Connect account this as their own guide profile. To change it, contact us."
          >
            <Input name="email" type="email" readOnly value={savedEmail} />
          </Field>
        ) : (
          <>
            <Field
              label={GUIDE_FIELD_LABELS.email}
              hint={`Optional. Only for one with a Connect account, as the owner or a driver: it shows them this as their own guide profile.${inConnect ? " Once saved, contact us to change it." : ""}`}
            >
              <Input
                name="email"
                type="email"
                autoComplete="off"
                placeholder="siti@example.com"
                defaultValue={savedEmail ?? ""}
              />
            </Field>
            <ConfirmEmailField
              required={false}
              placeholder="siti@example.com"
              hint="Type it again when you enter or change it, to catch a typo."
            />
          </>
        )
      }
      side={
        <>
          <Card>
            <CardTitle>
              <span className="inline-flex items-center gap-1.5">
                {GUIDE_FIELD_LABELS.languages}
                <InfoTip text="Customers choose their guide's language from this same list, and only a guide who speaks the one paid for can be assigned." />
              </span>
            </CardTitle>
            <FieldGroup className="grid grid-cols-2 gap-2">
              {GUIDE_LANGUAGES.map((language) => (
                <label
                  key={language}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    name={GUIDE_LANGUAGES_FIELD}
                    value={language}
                    defaultChecked={speaks.has(language)}
                  />
                  {language}
                </label>
              ))}
            </FieldGroup>
          </Card>
          <Card>
            <CardTitle>
              <span className="inline-flex items-center gap-1.5">
                Licence
                <InfoTip text="The expiry date of their tourist guide licence from MOTAC, kept for the record." />
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
          <BankCard fields={fields ?? undefined} whose="the guide" payee />
        </>
      }
    />
  );
}
