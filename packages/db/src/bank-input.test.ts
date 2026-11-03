import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkBankFields,
  maskTail,
  maskedForLog,
  readBankFields,
} from "./bank-input";

describe("bank details", () => {
  it("reads the number as digits and takes all three or none", () => {
    const fields = readBankFields({
      bankName: "Maybank",
      bankAccountNumber: "1622-0123 4567",
      bankAccountName: " Ali bin Abu ",
    });
    assert.equal(fields.bankAccountNumber, "162201234567");
    assert.equal(fields.bankAccountName, "Ali bin Abu");
    assert.equal(checkBankFields(fields).ok, true);
    assert.equal(checkBankFields(readBankFields({})).ok, true);
    const noName = checkBankFields({ ...fields, bankAccountName: "" });
    assert.equal(noName.ok, false);
    assert.equal(
      checkBankFields({ ...fields, bankName: "Bank of Nowhere" }).ok,
      false,
    );
    assert.equal(
      checkBankFields({ ...fields, bankAccountNumber: "12" }).ok,
      false,
    );
  });

  it("keeps only the end of a number in the log", () => {
    assert.equal(maskTail("162201234567"), "ending 4567");
    assert.equal(maskTail(""), "");
    assert.deepEqual(
      maskedForLog({ name: "Ali", bankAccountNumber: "162201234567" }),
      {
        name: "Ali",
        bankAccountNumber: "ending 4567",
      },
    );
    assert.deepEqual(maskedForLog({ registrationNo: "900101145678" }), {
      registrationNo: "ending 5678",
    });
    assert.equal(maskedForLog(null), null);
  });
});
