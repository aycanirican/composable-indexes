import test from "node:test";
import { HashIndex, hashIndex } from "./HashIndex";
import fc from "fast-check";
import { propIndexAgainstReference } from "../test_util/reference";
import { testProps } from "../test_util/invariants";

test("HashIndex", async () => {
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

  await test("HashIndex.ref.countDistinct", () => {
    fc.assert(
      propIndexAgainstReference<number, HashIndex<number, number>, number>({
        valueGen: fc.integer(),
        index: hashIndex(),
        value: (ix) => ix.countDistinct(),
        reference: (arr) => {
          const set = new Set<number>();
          for (const it of arr) {
            set.add(it.value);
          }
          return set.size;
        },
      }),
      {
        numRuns: 10000,
      }
    )
  });

  const witnesses = {
    eq: (ix: HashIndex<number, number>) =>
      ix
        .eq(1)
        .map((v) => v.value)
        .sort(),
    countDistinct: (ix: HashIndex<number, number>) => ix.countDistinct(),
  };

  for (const [name, witness] of Object.entries(witnesses)) {
    await test(`props.${name}`, async (t) => {
      await testProps<number, HashIndex<number, number>, any>(t, {
        valueGen: fc.integer(),
        index: hashIndex(),
        witness,
      });
    });
  }
});

