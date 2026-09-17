"use client";

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { whatsappHrefFor, type ServiceKey } from "../../../_lib/trip";
import { placeById, type PlaceId } from "../../../_lib/routes";
import {
  START_COUNT,
  clampCount,
  partyOf,
  plural,
  type Party,
} from "../_lib/headcount";

type State = {
  count: number;
  /** The count before the last change: drives the tick and seat stagger. */
  previous: number;
  from: PlaceId;
  to: PlaceId;
  date: string;
};

type Action =
  | { type: "count"; value: number }
  | { type: "from"; value: PlaceId }
  | { type: "to"; value: PlaceId }
  | { type: "date"; value: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "count": {
      const count = clampCount(action.value);
      return count === state.count
        ? state
        : { ...state, count, previous: state.count };
    }
    case "from":
      return { ...state, from: action.value };
    case "to":
      return { ...state, to: action.value };
    case "date":
      return { ...state, date: action.value };
  }
}

const INITIAL: State = {
  count: START_COUNT,
  previous: START_COUNT,
  from: "langkawi",
  to: "penang",
  date: "",
};

type Headcount = State & {
  party: Party;
  previousParty: Party;
  whatsappHref: string;
  setCount: (value: number) => void;
  setFrom: (value: PlaceId) => void;
  setTo: (value: PlaceId) => void;
  setDate: (value: string) => void;
};

const HeadcountContext = createContext<Headcount | null>(null);

function serviceFor(party: Party, from: PlaceId, to: PlaceId): ServiceKey {
  if (party.vehicle.kind === "coach") return "coach";
  return from === "klia" || to === "klia" ? "transfer" : "car";
}

/**
 * One piece of state for the whole page. The numeral, the seat plan, the
 * manifest line, the fleet ladder and the WhatsApp links all read from here.
 */
export function HeadcountProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  const value = useMemo<Headcount>(() => {
    const party = partyOf(state.count);
    return {
      ...state,
      party,
      previousParty: partyOf(state.previous),
      whatsappHref: whatsappHrefFor({
        service: serviceFor(party, state.from, state.to),
        from: placeById(state.from).name,
        to: placeById(state.to).name,
        date: state.date,
        passengers: `${plural(state.count, "person", "people")} (${party.label})`,
      }),
      setCount: (v) => dispatch({ type: "count", value: v }),
      setFrom: (v) => dispatch({ type: "from", value: v }),
      setTo: (v) => dispatch({ type: "to", value: v }),
      setDate: (v) => dispatch({ type: "date", value: v }),
    };
  }, [state]);

  return (
    <HeadcountContext.Provider value={value}>
      {children}
    </HeadcountContext.Provider>
  );
}

export function useHeadcount(): Headcount {
  const value = useContext(HeadcountContext);
  if (!value) {
    throw new Error("useHeadcount must be used inside HeadcountProvider");
  }
  return value;
}
