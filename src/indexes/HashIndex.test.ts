import test from "node:test";
import { HashIndex, hashIndex } from "./HashIndex";
import fc from "fast-check";
import { assertIndexAgainstReference } from "../test_util/reference";
import { Collection, Item } from "../Collection";
import { deepStrictEqual } from "node:assert";
import Long from "long";

test("HashIndex", async (t) => {
  await test("unit", () => {
    const col = new Collection<number>()
    const ix = col.registerIndex(hashIndex())

    const id = col.add(1)
    deepStrictEqual(id, Long.fromNumber(1, true))

    deepStrictEqual(ix.eq(1), [new Item(id, 1)])

    
    col.delete(Long.fromNumber(1, true))

    deepStrictEqual(ix.eq(1), [])
  })


  await test.skip("HashIndex.ref", () => {
    assertIndexAgainstReference<number, HashIndex<number, number>, number[]>({
      valueGen: fc.integer(),
      index: hashIndex(),
      value: (ix) => ix.eq(1).map((v) => v.value),
      reference: (arr) => arr.map(([_, v]) => v).filter((v) => v === 1),
    });
  });
});
