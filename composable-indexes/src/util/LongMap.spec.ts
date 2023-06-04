import test from "node:test";
import fc from "fast-check";

import { LongMap } from "./LongMap";
import Long from "long";
import { deepStrictEqual } from "node:assert";

test("LongMap", async (t) => {
  await test("ref", () => {
    return fc.assert(
      fc.property(fc.array(arbCall({ value: fc.boolean() })), (calls) => {
        const map = new LongMap<boolean>();
        const ref = new Map<string, boolean>();

        for (const call of calls) {
          switch (call.type) {
            case "set":
              map.set(call.id, call.value);
              ref.set(call.id.toString(16), call.value);
              break;
            case "delete":
              map.delete(call.id);
              ref.delete(call.id.toString(16));
              break;
          }
        }

        const actual: [string, boolean][] = [];
        map.forEach((value, key) => {
          actual.push([key.toString(16), value]);
        });

        const expected = Array.from(ref.entries());

        actual.sort((a, b) => a[0].localeCompare(b[0]));
        expected.sort((a, b) => a[0].localeCompare(b[0]));

        deepStrictEqual(actual, expected);
      }),
      {
        numRuns: 10000,
      }
    );
  });
});

const arbLong = fc
  .tuple(
    fc.integer({ min: 0, max: 2 ** 20 - 1 }),
    fc.integer({ min: 0, max: 2 ** 20 - 1 })
  )
  .map(([hi, lo]) => new Long(hi, lo, true));

type Call<T> =
  | {
      type: "set";
      id: Long;
      value: T;
    }
  | {
      type: "delete";
      id: Long;
    };

export function arbCall<T>(args: {
  value: fc.Arbitrary<T>;
}): fc.Arbitrary<Call<T>> {
  return fc.oneof(
    fc.record({
      type: fc.constant<"set">("set"),
      id: arbLong,
      value: args.value,
    }),
    fc.record({
      type: fc.constant<"delete">("delete"),
      id: arbLong,
    })
  );
}
