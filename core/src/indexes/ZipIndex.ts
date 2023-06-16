import { Index, IndexContext, UnregisteredIndex } from "../core/Index";
import { Update } from "../core/Update";

export class ZipIndex<In, Out, Indexes extends Index<In, Out>[]> extends Index<In, Out> {
    private constructor(
        ctx: IndexContext<Out>,
        private readonly indexes: Indexes
    ) {
        super(ctx);
    }

    _onUpdate(update: Update<In>): () => void {
        const cbs = this.indexes.map((ix) => ix._onUpdate(update));
        return () => {
            for (const cb of cbs) {
                cb();
            }
        };
    }

    get(): Indexes {
        return this.indexes;
    }

    static create<In, Out, Indexes extends Index<In, Out>[]>(
        ixs: MapUnregistered<In, Out, Indexes>
      ): UnregisteredIndex<In, Out, ZipIndex<In, Out, Indexes>> {
        return new UnregisteredIndex((ctx: IndexContext<Out>) => {
          const inner = ixs.map((ix) => ix._register(ctx)) as Indexes;
          const ix = new ZipIndex(ctx, inner);
          return ix;
        });
      }
    
}

type MapUnregistered<In, Out, Indexes extends Index<In, Out>[]> = {
    [I in keyof Indexes]: UnregisteredIndex<In, Out, Indexes[I]>
}

export function zip<In, Out, Ix1 extends Index<In, Out>, Ix2 extends Index<In, Out>>(
    ix1: UnregisteredIndex<In, Out, Ix1>,
    ix2: UnregisteredIndex<In, Out, Ix2>
): UnregisteredIndex<In, Out, ZipIndex<In, Out, [Ix1, Ix2]>> {
    const ixs: [UnregisteredIndex<In, Out, Ix1>, UnregisteredIndex<In, Out, Ix2>] = [ix1, ix2]
    return ZipIndex.create(ixs);
}

// Warm up Copilot for below :)

export function zip3<In, Out, Ix1 extends Index<In, Out>, Ix2 extends Index<In, Out>, Ix3 extends Index<In, Out>>(
    ix1: UnregisteredIndex<In, Out, Ix1>,
    ix2: UnregisteredIndex<In, Out, Ix2>,
    ix3: UnregisteredIndex<In, Out, Ix3>
): UnregisteredIndex<In, Out, ZipIndex<In, Out, [Ix1, Ix2, Ix3]>> {
    const ixs: [UnregisteredIndex<In, Out, Ix1>, UnregisteredIndex<In, Out, Ix2>, UnregisteredIndex<In, Out, Ix3>] = [ix1, ix2, ix3]
    return ZipIndex.create(ixs);
}

export function zip4<In, Out, Ix1 extends Index<In, Out>, Ix2 extends Index<In, Out>, Ix3 extends Index<In, Out>, Ix4 extends Index<In, Out>>(
    ix1: UnregisteredIndex<In, Out, Ix1>,
    ix2: UnregisteredIndex<In, Out, Ix2>,
    ix3: UnregisteredIndex<In, Out, Ix3>,
    ix4: UnregisteredIndex<In, Out, Ix4>
): UnregisteredIndex<In, Out, ZipIndex<In, Out, [Ix1, Ix2, Ix3, Ix4]>> {
    const ixs: [UnregisteredIndex<In, Out, Ix1>, UnregisteredIndex<In, Out, Ix2>, UnregisteredIndex<In, Out, Ix3>, UnregisteredIndex<In, Out, Ix4>] = [ix1, ix2, ix3, ix4]
    return ZipIndex.create(ixs);
}

export function zip5<In, Out, Ix1 extends Index<In, Out>, Ix2 extends Index<In, Out>, Ix3 extends Index<In, Out>, Ix4 extends Index<In, Out>, Ix5 extends Index<In, Out>>(
    ix1: UnregisteredIndex<In, Out, Ix1>,
    ix2: UnregisteredIndex<In, Out, Ix2>,
    ix3: UnregisteredIndex<In, Out, Ix3>,
    ix4: UnregisteredIndex<In, Out, Ix4>,
    ix5: UnregisteredIndex<In, Out, Ix5>
): UnregisteredIndex<In, Out, ZipIndex<In, Out, [Ix1, Ix2, Ix3, Ix4, Ix5]>> {
    const ixs: [UnregisteredIndex<In, Out, Ix1>, UnregisteredIndex<In, Out, Ix2>, UnregisteredIndex<In, Out, Ix3>, UnregisteredIndex<In, Out, Ix4>, UnregisteredIndex<In, Out, Ix5>] = [ix1, ix2, ix3, ix4, ix5]
    return ZipIndex.create(ixs);
}