import test from "node:test";
import { FocusedIndex, focus } from "./FocusedIndex";
import fc from "fast-check";
import { propIndexAgainstReference } from "../test_util/reference";
import { HashIndex, hashIndex } from "./HashIndex";

type Foo = {
  bar: number,
  baz: number
}

test("FocusedIndex", async () => {
  await test("ref", () => {
    fc.assert(
      propIndexAgainstReference<Foo, FocusedIndex<Foo, Foo, number, HashIndex<number, Foo>>, number>({
        valueGen: fc.record({
          bar: fc.integer(),
          baz: fc.integer(),
        }),
        index: focus(i => i.bar, hashIndex()),
        value: (ix) => ix.inner.countDistinct(),
        reference: (arr) => (new Set(arr.map(i => i.value.bar))).size,
      }),
      {
        numRuns: 10000,
      }
    )
  });
});

