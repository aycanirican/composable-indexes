import test from "node:test";
import { GroupedIndex, group } from "./GroupedIndex";
import fc from "fast-check";
import { propIndexAgainstReference } from "../test_util/reference";
import { HashIndex, hashIndex } from "./HashIndex";

type Foo = {
  bar: number,
  baz: number
}

test("GroupedIndex", async () => {
  await test("ref", () => {
    fc.assert(
      propIndexAgainstReference<number, GroupedIndex<number, number, HashIndex<number, number>>, number | undefined>({
        valueGen: fc.nat({max:100}),
        index: group(i => Math.floor(i / 10), hashIndex()),
        value: (ix) => ix.where(5, ix => ix.countDistinct()) ?? 0,
        reference: (arr) => (new Set(arr.map(i => i.value).filter(i => i >= 50 && i < 60))).size,
      }),
      {
        numRuns: 10000,
      }
    )
  });
});

