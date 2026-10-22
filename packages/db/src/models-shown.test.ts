import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classCoverOf, shownModel } from "./models-shown";

const photo = (url: string) => ({ url, caption: "" });
const at = (day: number) => new Date(Date.UTC(2026, 9, day));

describe("shownModel", () => {
  it("names a model by brand and name, its vehicles' photos in order", () => {
    assert.deepEqual(
      shownModel({
        id: "m1",
        brand: "Toyota",
        name: "Alphard",
        vehicles: [
          { photos: [photo("a1"), photo("a2")] },
          { photos: [photo("b1")] },
        ],
      }),
      {
        id: "m1",
        name: "Toyota Alphard",
        photos: [photo("a1"), photo("a2"), photo("b1")],
      },
    );
  });

  it("keeps the first 12 photos", () => {
    const many = Array.from({ length: 10 }, (_, i) => photo(`p${i}`));
    const model = shownModel({
      id: "m1",
      brand: "Toyota",
      name: "Alphard",
      vehicles: [{ photos: many }, { photos: many }],
    });
    assert.equal(model.photos.length, 12);
  });
});

describe("classCoverOf", () => {
  it("is the first photo of the vehicle entered first that has one", () => {
    const models = [
      {
        vehicles: [
          { createdAt: at(3), photos: [photo("late")] },
          { createdAt: at(1), photos: [] },
        ],
      },
      {
        vehicles: [{ createdAt: at(2), photos: [photo("early"), photo("x")] }],
      },
    ];
    assert.equal(classCoverOf(models, "catalogue"), "early");
  });

  it("falls back to the catalogue's picture, then to none", () => {
    const bare = [{ vehicles: [{ createdAt: at(1), photos: [] }] }];
    assert.equal(classCoverOf(bare, "catalogue"), "catalogue");
    assert.equal(classCoverOf([], null), null);
  });
});
