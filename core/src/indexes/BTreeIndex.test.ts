import test from "node:test";
import { BTreeIndex, btreeIndex } from "./BTreeIndex";
import fc from "fast-check";
import { propIndexAgainstReference } from "../test_util/reference";
import { Item } from "../core/Index";
import { testProps } from "../test_util/invariants";

test("BTreeIndex", async (t) => {
  await test("ref.eq", () => {
    fc.assert(
      propIndexAgainstReference<
        number,
        BTreeIndex<number, number>,
        Item<number>[]
      >({
        valueGen: fc.integer({ min: 0, max: 5 }),
        index: btreeIndex(),
        value: (ix) => ix.eq(1).sort((a, b) => a.id.compare(b.id)),
        reference: (arr) =>
          arr.filter((it) => it.value === 1).sort((a, b) => a.id.compare(b.id)),
      }),
      {
        numRuns: 10000,
      }
    );
  });

  await test("ref.max", () => {
    fc.assert(
      propIndexAgainstReference<
        number,
        BTreeIndex<number, number>,
        Item<number>[]
      >({
        valueGen: fc.integer({ min: 0, max: 5 }),
        index: btreeIndex(),
        value: (ix) => ix.max().sort((a, b) => a.id.compare(b.id)),
        reference: (arr) => {
          // Find the maximum value
          const max = Math.max(...arr.map((it) => it.value));
          // Find all items with that value
          return arr
            .filter((it) => it.value === max)
            .sort((a, b) => a.id.compare(b.id));
        },
      }),
      {
        numRuns: 10000,
      }
    );
  });

  await test("ref.range", () => {
    fc.assert(
      propIndexAgainstReference<
        number,
        BTreeIndex<number, number>,
        number[]
      >({
        valueGen: fc.integer({ min: 0, max: 5 }),
        index: btreeIndex(),
        value: (ix) => ix.range({ minValue: 1, maxValue: 3 }).map(i => i.value).sort(),
        reference: (arr) => {
          return arr
            .map((it) => it.value)
            .filter((v) => v >= 1 && v <= 3)
            .sort();
        },
      }),
      {
        numRuns: 10000,
      }
    );
  });

  const witnesses = {
    eq: (ix: BTreeIndex<number, number>) =>
      ix
        .eq(1)
        .map((v) => v.value)
        .sort(),
    countDistinct: (ix: BTreeIndex<number, number>) => ix.countDistinct(),
    max: (ix: BTreeIndex<number, number>) => {
      const ret = ix.max();
      return [ret[0]?.value, ret.length];
    },
    min: (ix: BTreeIndex<number, number>) => {
      const ret = ix.min();
      return [ret[0]?.value, ret.length];
    },
    range: (ix: BTreeIndex<number, number>) => {
      const ret = ix.range({
        minValue: 1,
        maxValue: 3
      });
      return ret.map(it => it.value).sort();
    },
  };

  for (const [name, witness] of Object.entries(witnesses)) {
    await test(`props.${name}`, async (t) => {
      await testProps<number, BTreeIndex<number, number>, any>(t, {
        valueGen: fc.integer(),
        index: btreeIndex(),
        witness,
      });
    });
  }
});
