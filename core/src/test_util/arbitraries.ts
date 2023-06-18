import * as fc from "fast-check";
import Long from "long";
import { Id } from "../core/simple_types";

export function arbId(range: number): fc.Arbitrary<Id> {
  return fc
    .integer({
      min: 0,
      max: range,
    })
    .map((n) => Id.fromLong(Long.fromNumber(n, true)));
}
