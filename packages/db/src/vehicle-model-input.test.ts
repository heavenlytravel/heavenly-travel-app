import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MODEL_PHOTOS_FIELD,
  modelsLine,
  parseVehicleModelFields,
  photoAlt,
} from "./vehicle-model-input";

const PHOTO = "https://abc123.ufs.sh/f/key-1";

const FORM: Record<string, string> = {
  name: " Toyota Alphard ",
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
        name: "Toyota Alphard",
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

  it("needs a name and a whole sort order", () => {
    assert.match(errorOf({ name: "" }) ?? "", /name/);
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

  it("lists a class's models as a card names them", () => {
    assert.equal(modelsLine([]), "");
    assert.equal(modelsLine([{ name: "Toyota Vios" }]), "Toyota Vios");
    assert.equal(
      modelsLine([
        { name: "Toyota Vellfire" },
        { name: "Toyota Alphard" },
        { name: "Lexus LM" },
      ]),
      "Toyota Vellfire, Toyota Alphard or Lexus LM",
    );
  });
});
