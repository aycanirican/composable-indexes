import * as fc from "fast-check";
import { Id } from "../Collection";
import Long from "long";

export function arbId(range: number): fc.Arbitrary<Id> {
  return fc
    .integer({
      min: 0,
      max: range,
    })
    .map((n) => Long.fromNumber(n));
}

export type Call<T> =
  | {
      type: "add";
      value: T;
    }
  | {
      type: "set";
      id: Id;
      value: T;
    }
  | {
      type: "delete";
      id: Id;
    };

export function arbCall<T>(args: {
  value: fc.Arbitrary<T>;
  idRange: number;
}): fc.Arbitrary<Call<T>> {
  return fc.oneof(
    fc.record({
      type: fc.constant<"add">("add"),
      value: args.value,
    }),
    fc.record({
      type: fc.constant<"set">("set"),
      id: arbId(args.idRange),
      value: args.value,
    }),
    fc.record({
      type: fc.constant<"delete">("delete"),
      id: arbId(args.idRange)
    })
  );
}

export function arbCalls<T>(args: {
    value: fc.Arbitrary<T>;
    idRange: number;
    maxLength: number;
}): fc.Arbitrary<Call<T>[]> {
    return fc.array(arbCall(args), { minLength: 0, maxLength: args.maxLength })
}
