import { redirect } from "next/navigation";
import { listRegistrationLocations } from "@repo/db/server";
import { BadgeCheck, CarFront, Smartphone } from "lucide-react";
import { requireSignedIn } from "../_lib/access";
import { Panel } from "../_ui/parts";
import { BandHeading, Screen } from "../_ui/Screen";
import { RegisterForm } from "./RegisterForm";

/** What a vendor gets, and how it starts. */
const STEPS = [
  {
    icon: BadgeCheck,
    title: "We check and approve you",
    text: "We look at every vendor and email you once Connect opens to you.",
  },
  {
    icon: CarFront,
    title: "Add your vehicles and drivers",
    text: "We offer you jobs of their classes, where they are based.",
  },
  {
    icon: Smartphone,
    title: "Take jobs and get paid",
    text: "Accept an offer with what we pay; your driver reports the trip from their phone.",
  },
];

/**
 * Route: /register. A signed-in account that is neither a vendor's member
 * nor a driver registers a vendor, company or individual, and becomes its
 * owner. Anyone else goes home, where their screen says where they stand.
 * See docs/261028-fulfilment-vendors-and-connect.md, "Signing up".
 */
export default async function RegisterPage() {
  const access = await requireSignedIn();
  if (access.status !== "register") redirect("/");
  const locations = await listRegistrationLocations();
  return (
    <Screen
      nav={false}
      back={{ href: "/", label: "Back" }}
      asideFirst
      aside={
        <Panel className="connect-rise p-5">
          <ol className="grid gap-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="relative grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-tint text-brand">
                  <step.icon aria-hidden className="size-5" />
                  <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-ink text-[0.6rem] font-bold text-white">
                    {index + 1}
                  </span>
                </span>
                <span className="grid gap-0.5">
                  <span className="font-semibold text-ink">{step.title}</span>
                  <span className="text-sm text-slate-500">{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      }
      band={
        <BandHeading
          eyebrow="Drive with Heavenly Travel"
          title="Register as a vendor"
        >
          Supply vehicles, drivers or both. A driver for a vendor already with
          us does not register: their vendor adds them.
        </BandHeading>
      }
    >
      <RegisterForm email={access.user.email} locations={locations} />
    </Screen>
  );
}
