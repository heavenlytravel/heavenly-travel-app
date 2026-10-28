"use client";

import { CONTACT_NAME_MAX_LENGTH, formatMyr, parseContact } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { useState } from "react";
import { BOOKINGS_PATH } from "../../../_lib/routes";
import { useActionForm } from "../../../_lib/use-action-form";
import { BookingSummary } from "../_components/BookingSummary";
import { ItemHiddenFields } from "../_components/ItemHiddenFields";
import {
  ItemSteps,
  itemStepsDone,
  type ItemStep,
} from "../_components/ItemSteps";
import { Step, StepFoot } from "../_components/Step";
import {
  agreedPriceIssue,
  chosenClass,
  CONTACT_FIELDS,
  EMPTY_ITEM_DRAFT,
  itemTotalSen,
  tripLine,
  vehicleLine,
  type ItemDraft,
} from "../_lib/trip-form";
import { createManualBookingAction } from "./actions";

type Contact = { name: string; phone: string; email: string };
type StepKey = "customer" | ItemStep;

const EMPTY_CONTACT: Contact = { name: "", phone: "", email: "" };

/**
 * The manual booking, in four steps on one page: the customer, the trip,
 * the vehicle and the details. One step is open at a time; a finished one
 * folds to a line with "Edit", so a detail that changes mid-call is one
 * click away and nothing entered is lost. The summary beside the steps
 * keeps what was entered, the price and the button in view; the agreed
 * price is set there, under the total. The server prices the trip again
 * and applies the agreed price itself. One vehicle per booking: the
 * create action takes several items, but the form offers one for now.
 * See docs/261018-location-work-and-class-catalogue.md.
 */
export function NewBookingForm({
  hasGoogle,
}: {
  /** False when the server runs without a Google key and offers the districts themselves. */
  hasGoogle: boolean;
}) {
  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT);
  const [draft, setDraft] = useState<ItemDraft>(EMPTY_ITEM_DRAFT);
  const [open, setOpen] = useState<StepKey | null>("customer");
  const create = useActionForm(createManualBookingAction, {
    done: "Booking created. The customer gets the received email.",
  });

  const patch = (changes: Partial<ItemDraft>) =>
    setDraft((current) => ({ ...current, ...changes }));
  const customer = parseContact(contact);
  const done = itemStepsDone(draft);
  const chosen = chosenClass(draft);
  const priceIssue = agreedPriceIssue(draft);
  const missing = !customer.ok
    ? "Fill in the customer."
    : !done.trip
      ? "Fill in the trip."
      : !done.vehicle
        ? "Choose a vehicle."
        : priceIssue;
  const totalSen = itemTotalSen(draft);

  return (
    <form
      {...create.formProps}
      // Enter in a field does not create the booking: the button does.
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault();
        }
      }}
      className="@container"
    >
      <input type="hidden" name={CONTACT_FIELDS.name} value={contact.name} />
      <input type="hidden" name={CONTACT_FIELDS.phone} value={contact.phone} />
      <input type="hidden" name={CONTACT_FIELDS.email} value={contact.email} />
      <ItemHiddenFields index={0} draft={draft} canPrice />

      <div className="grid gap-6 @3xl:grid-cols-[1fr_20rem] @3xl:items-start">
        <div className="grid min-w-0 gap-3">
          <Step
            number={1}
            title="Customer"
            done={customer.ok}
            summary={
              customer.ok
                ? [contact.name, contact.phone, contact.email].join(" · ")
                : "Who the booking is for"
            }
            open={open === "customer"}
            onOpen={() => setOpen("customer")}
          >
            <CustomerFields contact={contact} onChange={setContact} />
            <StepFoot
              disabled={!customer.ok}
              missing={
                customer.ok || contact === EMPTY_CONTACT ? null : customer.error
              }
              onNext={() => setOpen("trip")}
            />
          </Step>
          <ItemSteps
            first={2}
            draft={draft}
            onChange={patch}
            open={open}
            onOpen={setOpen}
            hasGoogle={hasGoogle}
          />
        </div>

        <aside className="@3xl:sticky @3xl:top-20">
          <BookingSummary
            rows={[
              {
                label: "Customer",
                value: customer.ok ? (
                  <>
                    {contact.name}
                    <span className="block text-slate-600">
                      {contact.phone}
                    </span>
                  </>
                ) : (
                  "—"
                ),
              },
              { label: "Trip", value: draft.quote ? tripLine(draft) : "—" },
              {
                label: "Vehicle",
                value: chosen ? vehicleLine(draft, { price: false }) : "—",
              },
            ]}
            draft={draft}
            onChange={patch}
            canPrice
            submit={
              <Button
                type="submit"
                disabled={create.pending || missing !== null}
              >
                {create.pending
                  ? "Creating…"
                  : totalSen !== null
                    ? `Create booking · ${formatMyr(totalSen)}`
                    : "Create booking"}
              </Button>
            }
            missing={missing}
            error={create.error}
            cancelHref={BOOKINGS_PATH}
          />
          <p className="mt-3 px-1 text-xs text-slate-500">
            The booking is received until Reservation confirms it, as one from
            the website is, and the customer gets the received email.
          </p>
        </aside>
      </div>
    </form>
  );
}

/** Who the booking is for: the name the driver asks for, a phone and an email. */
function CustomerFields({
  contact,
  onChange,
}: {
  contact: Contact;
  onChange: (contact: Contact) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Name for the driver" className="sm:col-span-2">
        <Input
          maxLength={CONTACT_NAME_MAX_LENGTH}
          autoComplete="off"
          value={contact.name}
          onChange={(e) => onChange({ ...contact, name: e.target.value })}
        />
      </Field>
      <Field label="Phone">
        <Input
          type="tel"
          placeholder="+60 12 345 6789"
          autoComplete="off"
          value={contact.phone}
          onChange={(e) => onChange({ ...contact, phone: e.target.value })}
        />
      </Field>
      <Field
        label="Email"
        hint="The booking emails go here. An email with an account puts the booking under it."
      >
        <Input
          type="email"
          autoComplete="off"
          value={contact.email}
          onChange={(e) => onChange({ ...contact, email: e.target.value })}
        />
      </Field>
    </div>
  );
}
