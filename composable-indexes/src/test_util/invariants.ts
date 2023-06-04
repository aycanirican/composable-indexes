import fc from "fast-check";
import { Collection, Index, UnregisteredIndex } from "../Collection";
import {
  Call,
  arbCallAdd,
  arbCallDelete,
  arbCallSet,
  playCalls,
  ppCalls,
} from "./call";
import shuffle from "shuffle-seed";
import { deepStrictEqual } from "assert";

export function propIndexAddCommutes<T, Ix extends Index<T, T>, Ret>(args: {
  valueGen: fc.Arbitrary<T>;
  index: UnregisteredIndex<T, T, Ix>;
  value: (ix: Ix) => Ret;
}): fc.IPropertyWithHooks<[ctx: fc.ContextValue, calls: Call<T>[]]> {
  return fc.property(
    fc.context(),
    fc.array(arbCallAdd(args.valueGen), { minLength: 0, maxLength: 100 }),
    (ctx, calls) => {
      function go(ann: string, cs: Call<T>[]) {
        const col = new Collection<T>();
        const ix = col.registerIndex(args.index);
        ctx.log(`Calls ${ann}: ${ppCalls(cs)}`);
        playCalls(col, cs);
        return args.value(ix);
      }

      const shuffled = shuffle.shuffle(calls, "deterministic");
      deepStrictEqual(go("left", calls), go("right", shuffled));
    }
  );
}

export function propIdempotence<T, Ix extends Index<T, T>, Ret>(args: {
  valueGen: fc.Arbitrary<T>;
  index: UnregisteredIndex<T, T, Ix>;
  value: (ix: Ix) => Ret;
}): fc.IPropertyWithHooks<[ctx: fc.ContextValue, calls: Call<T>[]]> {
  return fc.property(
    fc.context(),
    fc.array(
      fc.oneof(arbCallSet({ value: args.valueGen }), arbCallDelete({})),
      { minLength: 0, maxLength: 100 }
    ),
    (ctx, calls) => {
      const col = new Collection<T>();
      const ix = col.registerIndex(args.index);
      ctx.log(`Calls: ${ppCalls(calls)}`);

      playCalls(col, calls);
      const first = args.value(ix);

      playCalls(col, calls);
      const second = args.value(ix);

      deepStrictEqual(first, second);
    }
  );
}

export async function testProps<T, Ix extends Index<T, T>, Ret>(
  ctx: TestContext,
  args: {
    valueGen: fc.Arbitrary<T>;
    index: UnregisteredIndex<T, T, Ix>;
    witness: (ix: Ix) => Ret;
  }
) {
  await ctx.test("propIndexAddCommutes", async () => {
    await fc.assert(
      propIndexAddCommutes({
        ...args,
        value: args.witness,
      }),
      {
        numRuns: 10000,
      }
    );
  });

  await ctx.test("propIdempotence", async () => {
    await fc.assert(
      propIdempotence({
        ...args,
        value: args.witness,
      }),
      {
        numRuns: 10000,
      }
    );
  });
}

interface TestContext {
  test: (name: string, fn: () => Promise<void>) => Promise<void>;
}
