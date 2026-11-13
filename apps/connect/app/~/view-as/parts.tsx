import { Panel } from "../../_ui/parts";
import { BandHeading, Screen } from "../../_ui/Screen";

/** What /view-as answers someone who is not SUPER, or an account that cannot be viewed. */
export function CannotView({ text }: { text: string }) {
  return (
    <Screen
      nav={false}
      width="narrow"
      band={<BandHeading eyebrow="View As" title="Can't view" />}
    >
      <Panel className="connect-rise p-6">
        <p className="text-base text-pretty text-body">{text}</p>
      </Panel>
    </Screen>
  );
}

export const NOT_SUPER = "Only a super admin can view Connect as someone else.";

/** What a view is, said before one starts. */
export function ViewAsRules() {
  return (
    <ul className="grid list-disc gap-1.5 pl-5 text-sm text-muted">
      <li>You see Connect as they see it, until you Exit or sign out.</li>
      <li>It is read only: nothing you press is saved.</li>
      <li>
        Starting, ending and each customer&apos;s details you open are logged
        under your name.
      </li>
    </ul>
  );
}
