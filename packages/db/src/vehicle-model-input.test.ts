import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MODEL_PHOTOS_FIELD,
  modelName,
  modelsLine,
  parseVehicleModelFields,
  photoAlt,
  sameName,
} from "./vehicle-model-input";

const PHOTO = "https://abc123.ufs.sh/f/key-1";

const FORM: Record<string, string> = {
  brand: " Toyota ",
  name: " Alphard ",
  sortOrder: "2",
  isActive: "on",
  [MODEL_PHOTOS_FIELD]: JSON.stringify([
    { url: PHOTO, caption: " Interior " },
    { url: PHOTO, caption: "" },
  ]),
};

function errorOf(values: Record<string, string>) {
  const result = parseVehicleModelFields({ ...FORM, ...values });
  return result.ok ? null : result.error;
}

describe("parseVehicleModelFields", () => {
  it("reads the form, its photos in order", () => {
    assert.deepEqual(parseVehicleModelFields(FORM), {
      ok: true,
      value: {
        brand: "Toyota",
        name: "Alphard",
        sortOrder: 2,
        isActive: true,
        photos: [
          { url: PHOTO, caption: "Interior" },
          { url: PHOTO, caption: "" },
        ],
      },
    });
  });

  it("takes no photos as an empty list", () => {
    const result = parseVehicleModelFields({
      ...FORM,
      [MODEL_PHOTOS_FIELD]: "",
    });
    assert.deepEqual(result.ok && result.value.photos, []);
  });

  it("needs a brand, a model and a whole sort order", () => {
    assert.match(errorOf({ brand: "" }) ?? "", /brand/);
    assert.match(errorOf({ name: "" }) ?? "", /model/);
    assert.match(errorOf({ sortOrder: "1.5" }) ?? "", /sort order/);
  });

  it("takes photos stored on UploadThing only", () => {
    assert.match(
      errorOf({
        [MODEL_PHOTOS_FIELD]: JSON.stringify([
          { url: "https://example.com/a.jpg", caption: "" },
        ]),
      }) ?? "",
      /photo/,
    );
    assert.match(
      errorOf({ [MODEL_PHOTOS_FIELD]: "{not json" }) ?? "",
      /photos/,
    );
  });

  it("holds at most 12 photos", () => {
    const thirteen = Array.from({ length: 13 }, () => ({
      url: PHOTO,
      caption: "",
    }));
    assert.match(
      errorOf({ [MODEL_PHOTOS_FIELD]: JSON.stringify(thirteen) }) ?? "",
      /12 photos/,
    );
  });
});

describe("the words around a model", () => {
  it("names a photo by its caption beside the model", () => {
    assert.equal(
      photoAlt("Toyota Alphard", { caption: "Interior" }),
      "Toyota Alphard, Interior",
    );
    assert.equal(photoAlt("Toyota Alphard", { caption: "" }), "Toyota Alphard");
  });

  it("names a model by its brand and name", () => {
    assert.equal(
      modelName({ brand: "Toyota", name: "Alphard" }),
      "Toyota Alphard",
    );
    // A model named before brands were kept.
    assert.equal(
      modelName({ brand: "", name: "Toyota Alphard" }),
      "Toyota Alphard",
    );
  });

  it("takes a brand typed in other letters or spaces as the same", () => {
    assert.equal(sameName(" toyota ", "Toyota"), true);
    assert.equal(sameName("Land  Cruiser", "land cruiser"), true);
    assert.equal(sameName("Vios", "City"), false);
  });

  it("lists a class's models as a card names them", () => {
    assert.equal(modelsLine([]), "");
    assert.equal(modelsLine(["Toyota Vios"]), "Toyota Vios");
    assert.equal(
      modelsLine(["Toyota Vellfire", "Toyota Alphard", "Lexus LM"]),
      "Toyota Vellfire, Toyota Alphard or Lexus LM",
    );
  });
});
