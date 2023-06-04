import * as fc from "fast-check";
import { Collection, Id } from "../Collection";
import { arbId } from "./arbitraries";

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

export function ppCall(call: Call<any>): string {
  switch (call.type) {
    case "add":
      return `add(${call.value})`;
    case "set":
      return `set(${call.id.toString(10)}, ${call.value})`;
    case "delete":
      return `delete(${call.id})`;
  }
}

export function ppCalls(calls: Call<any>[]): string {
    return "[" + calls.map(ppCall).join(", ") + `]`;
}

export function arbCallAdd<T>(value: fc.Arbitrary<T>): fc.Arbitrary<Call<T>> {
    return fc.record({
        type: fc.constant<"add">("add"),
        value: value
    })
}

export function arbCallSet<T>(args: {
    value: fc.Arbitrary<T>;
    idRange?: number;
}): fc.Arbitrary<Call<T>> {
    return fc.record({
        type: fc.constant<"set">("set"),
        id: arbId(args.idRange ?? 10),
        value: args.value
    })
}

export function arbCallDelete(args: {
    idRange?: number;
}): fc.Arbitrary<Call<any>> {
    return fc.record({
        type: fc.constant<"delete">("delete"),
        id: arbId(args.idRange ?? 10)
    })
}

export function arbCall<T>(args: {
  value: fc.Arbitrary<T>;
  idRange?: number;
}): fc.Arbitrary<Call<T>> {
  return fc.oneof(
    arbCallAdd(args.value),
    arbCallSet(args),
    arbCallDelete(args)
  );
}

export function arbCalls<T>(args: {
    value: fc.Arbitrary<T>;
    idRange: number;
    maxLength: number;
}): fc.Arbitrary<Call<T>[]> {
    return fc.array(
        arbCall(args),
        { minLength: 0, maxLength: args.maxLength }
    )
}

export function playCalls<T>(f: Collection<T>, arr: Call<T>[]) {
    for (const call of arr) {
      switch (call.type) {
        case "add":
          f.add(call.value);
          break;
        case "set":
          f.set(call.id, call.value);
          break;
        case "delete":
          f.delete(call.id);
          break;
      }
    }
  }