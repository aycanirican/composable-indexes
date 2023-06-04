import fc from "fast-check";
import { Collection, Index, Item, UnregisteredIndex } from "../Collection";
import { Call, arbCalls, playCalls } from "./call";
import { deepStrictEqual } from "assert";
import { MockIndex } from "./MockIndex";

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

