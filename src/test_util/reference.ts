import fc from "fast-check";
import { Collection, Id, Index, UnregisteredIndex } from "../Collection";
import { Call, arbCalls } from "./arbitraries";
import { deepStrictEqual } from "assert";
import { MockIndex } from "./MockIndex";

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

export function propIndexAgainstReference<
  T,
  Ix extends Index<T, T>,
  Ret
>(args: {
  valueGen: fc.Arbitrary<T>;
  index: UnregisteredIndex<T, T, Ix>;
  value: (ix: Ix) => Ret;
  reference: (arrs: Item<T>[]) => Ret;
  examples?: [calls: Call<T>[]][];
}): fc.IPropertyWithHooks<[ctx: fc.ContextValue, calls: Call<T>[]]> {
  return fc.property(
    fc.context(),
    arbCalls({
      value: args.valueGen,
      idRange: 10,
      maxLength: 100,
    }),
    (ctx, calls) => {
      const col = new Collection<T>();

      const ix = col.registerIndex(args.index);
      const mockIx = col.registerIndex(MockIndex.create());

      playCalls(col, calls);

      ctx.log(`Updates: ${JSON.stringify(mockIx.collectedUpdates)}`)

      const outList = mockIx.toOutList();
      ctx.log(`OutList: ${JSON.stringify(outList)}`)

      const expected = args.reference(outList);
      const actual = args.value(ix);
      deepStrictEqual(actual, expected);
    }
  )
}
