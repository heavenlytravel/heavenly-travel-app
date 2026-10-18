import "server-only";
import { listStates } from "@repo/db/server";
import type { StateOption } from "../_components/StatePicker";

/** Every state as the picker offers it, by name. */
export async function stateOptions(): Promise<StateOption[]> {
  const states = await listStates();
  return states.map((state) => ({ code: state.code, name: state.name }));
}
