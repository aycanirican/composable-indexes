import test from "node:test";
import { PremapIndex, GroupedIndex, group, premap } from "./Index";
import { HashIndex, hashIndex } from "../indexes/HashIndex";
import fc from "fast-check";
import { propIndexAgainstReference } from "../test_util/reference";

type Foo = {
  bar: number;
  baz: number;
};

test("Index", async () => {
  await test("GroupedIndex", async () => {
    await test("ref", () => {
      fc.assert(
        propIndexAgainstReference<
          number,
          GroupedIndex<number, number, number, HashIndex<number, number>>,
          number | undefined
        >({
          valueGen: fc.nat({ max: 100 }),
          index: group((i) => Math.floor(i / 10), hashIndex()),
          value: (ix) => ix.where(5)?.countDistinct() ?? 0,
          reference: (arr) =>
            new Set(arr.map((i) => i.value).filter((i) => i >= 50 && i < 60))
              .size,
        }),
        {
          numRuns: 10000,
        }
      );
    });
  });

  await test("PremapIndex", async () => {
    await test("ref", () => {
      fc.assert(
        propIndexAgainstReference<
          Foo,
          PremapIndex<Foo, Foo, number, HashIndex<number, Foo>>,
          number
        >({
          valueGen: fc.record({
            bar: fc.integer(),
            baz: fc.integer(),
          }),
          index: premap((i) => i.bar, hashIndex()),
          value: (ix) => ix.get.countDistinct(),
          reference: (arr) => new Set(arr.map((i) => i.value.bar)).size,
        }),
        {
          numRuns: 10000,
        }
      );
    });
  });
});
