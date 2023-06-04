import * as fc from "fast-check";
import { Id } from "../Collection";
import Long from "long";

export function arbId(range: number): fc.Arbitrary<Id> {
  return fc
    .integer({
      min: 0,
      max: range,
    })
    .map((n) => Long.fromNumber(n, true));
}
