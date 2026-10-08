import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accountBookingPath,
  receivedPath,
  signInPath,
  signUpPath,
} from "./site-paths";

describe("site paths", () => {
  it("builds the received page with the masked email as a query", () => {
    assert.equal(receivedPath("HT-7K3QZM"), "/booking/received/HT-7K3QZM");
    assert.equal(
      receivedPath("HT-7K3QZM", "a***@gmail.com"),
      "/booking/received/HT-7K3QZM?to=a***%40gmail.com",
    );
  });

  it("carries the return in the sign-in and sign-up links", () => {
    assert.equal(
      signInPath("/booking/transportation/car-with-driver/confirm?m=oneway"),
      "/sign-in?redirect_url=%2Fbooking%2Ftransportation%2Fcar-with-driver%2Fconfirm%3Fm%3Doneway",
    );
    assert.equal(
      signUpPath("aina@gmail.com", accountBookingPath("HT-7K3QZM")),
      "/sign-up?email=aina%40gmail.com&redirect_url=%2Faccount%2Fbookings%2FHT-7K3QZM",
    );
    assert.equal(
      signUpPath(null, accountBookingPath("HT-7K3QZM")),
      "/sign-up?redirect_url=%2Faccount%2Fbookings%2FHT-7K3QZM",
    );
  });
});
