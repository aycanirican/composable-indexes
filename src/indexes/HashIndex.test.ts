import test from "node:test";
import { HashIndex, hashIndex } from "./HashIndex";
import fc from "fast-check";
import { propIndexAgainstReference } from "../test_util/reference";

test("HashIndex", async (t) => {
  await test("HashIndex.ref", () => {
    fc.assert(
      propIndexAgainstReference<number, HashIndex<number, number>, number[]>({
        valueGen: fc.integer(),
        index: hashIndex(),
        value: (ix) => ix.eq(1).map((v) => v.value),
        reference: (arr) => arr.map(it => it.value).filter((v) => v === 1),
      }),
      {
        numRuns: 10000,
      }
    )
  });
});
