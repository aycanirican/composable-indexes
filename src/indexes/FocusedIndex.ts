import {
  Index,
  IndexContext,
  UnregisteredIndex,
  Update,
  UpdateType,
} from "../Collection";
import { unreachable } from "../util";

export class FocusedIndex<In, Out, InnerIn, Inner extends Index<InnerIn, Out>> extends Index<In, Out> {
  private constructor(
    ctx: IndexContext<Out>,
    readonly inner: Inner,
    private readonly f: (_: In) => InnerIn
  ) {
    super(ctx);
  }

  static create<In, Out, InnerIn, Inner extends Index<InnerIn, Out>>(
    f: (_: In) => InnerIn,
    inner: UnregisteredIndex<InnerIn, Out, Inner>
  ): UnregisteredIndex<In, Out, FocusedIndex<In, Out, InnerIn, Inner>> {
    return (ctx: IndexContext<Out>) => {
      const ix = new FocusedIndex(ctx, inner(ctx), f);
      return ix;
    };
  }

  _onUpdate(update: Update<In>): () => void {
    const innerUpdate: Update<InnerIn> =
      update.type === UpdateType.ADD
        ? { type: UpdateType.ADD, id: update.id, value: this.f(update.value) }
        : update.type === UpdateType.UPDATE
        ? {
            type: UpdateType.UPDATE,
            id: update.id,
            oldValue: this.f(update.oldValue),
            newValue: this.f(update.newValue),
          }
        : update.type === UpdateType.DELETE
        ? {
            type: UpdateType.DELETE,
            id: update.id,
            oldValue: this.f(update.oldValue),
          }
        : unreachable(update);

    return this.inner._onUpdate(innerUpdate);
  }
}

export const focus = FocusedIndex.create
