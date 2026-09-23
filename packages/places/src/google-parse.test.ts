import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePlace, parseRoute, parseSuggestions } from "./google-parse";

describe("parseSuggestions", () => {
  it("reads place predictions and skips query predictions", () => {
    const body = {
      suggestions: [
        {
          placePrediction: {
            place: "places/ChIJ1",
            placeId: "ChIJ1",
            text: { text: "KLIA Terminal 1, Sepang, Selangor, Malaysia" },
            structuredFormat: {
              mainText: { text: "KLIA Terminal 1" },
              secondaryText: { text: "Sepang, Selangor, Malaysia" },
            },
          },
        },
        { queryPrediction: { text: { text: "klia hotels" } } },
        { placePrediction: { placeId: "ChIJ2", text: { text: "Only text" } } },
      ],
    };
    assert.deepEqual(parseSuggestions(body), [
      {
        placeId: "ChIJ1",
        label: "KLIA Terminal 1",
        detail: "Sepang, Selangor, Malaysia",
      },
      { placeId: "ChIJ2", label: "Only text", detail: "" },
    ]);
  });

  it("returns nothing for an empty body", () => {
    assert.deepEqual(parseSuggestions({}), []);
  });
});

describe("parsePlace", () => {
  const component = (longText: string, shortText: string, type: string) => ({
    longText,
    shortText,
    types: [type, "political"],
  });
  const details = {
    id: "ChIJlangkawi",
    displayName: { text: "Langkawi International Airport" },
    formattedAddress: "Padang Matsirat, 07100 Langkawi, Kedah, Malaysia",
    location: { latitude: 6.3297, longitude: 99.7287 },
    addressComponents: [
      component("Padang Matsirat", "Padang Matsirat", "sublocality"),
      component("Langkawi", "Langkawi", "locality"),
      component("Kedah", "Kedah", "administrative_area_level_1"),
      component("Malaysia", "MY", "country"),
      { longText: "07100", shortText: "07100", types: ["postal_code"] },
    ],
  };

  it("maps a Malaysian place with the district only in locality", () => {
    assert.deepEqual(parsePlace(details), {
      placeId: "ChIJlangkawi",
      label: "Langkawi International Airport",
      address: "Padang Matsirat, 07100 Langkawi, Kedah, Malaysia",
      lat: 6.3297,
      lng: 99.7287,
      state: "Kedah",
      district: null,
      locality: "Langkawi",
    });
  });

  it("reads administrative_area_level_2 as the district when present", () => {
    const place = parsePlace({
      ...details,
      addressComponents: [
        ...details.addressComponents,
        component("Petaling", "Petaling", "administrative_area_level_2"),
      ],
    });
    assert.equal(place?.district, "Petaling");
  });

  it("rejects places outside Malaysia", () => {
    const abroad = {
      ...details,
      addressComponents: [component("Singapore", "SG", "country")],
    };
    assert.equal(parsePlace(abroad), null);
  });

  it("rejects a body without coordinates", () => {
    assert.equal(parsePlace({ id: "x", location: {} }), null);
  });

  it("falls back to the first address line as the label", () => {
    const place = parsePlace({ ...details, displayName: undefined });
    assert.equal(place?.label, "Padang Matsirat");
  });
});

describe("parseRoute", () => {
  it("rounds metres to a tenth of a kilometre and seconds to minutes", () => {
    assert.deepEqual(
      parseRoute({ routes: [{ distanceMeters: 56789, duration: "4212s" }] }),
      { distanceKm: 56.8, durationMinutes: 70 },
    );
  });

  it("returns null when no route came back", () => {
    assert.equal(parseRoute({}), null);
    assert.equal(parseRoute({ routes: [] }), null);
  });
});
