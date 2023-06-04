import {
  AddUpdate,
  DeleteUpdate,
  Index,
  IndexContext,
  UnregisteredIndex,
  Update,
  UpdateType,
  UpdateUpdate,
} from "../Collection";
import { unreachable } from "../util";

export class GroupedIndex<In, Out, Inner extends Index<In, Out>> extends Index<
  In,
  Out
> {
  private readonly ixs: Map<string | number, Inner> = new Map();

  private constructor(
    private readonly ctx: IndexContext<Out>,
    private readonly inner: UnregisteredIndex<In, Out, Inner>,
    private readonly group: (_: In) => string | number
  ) {
    super(ctx);
  }

  static create<In, Out, Inner extends Index<In, Out>>(
    f: (_: In) => string | number,
    inner: UnregisteredIndex<In, Out, Inner>
  ): UnregisteredIndex<In, Out, GroupedIndex<In, Out, Inner>> {
    return (ctx: IndexContext<Out>) => {
      const ix = new GroupedIndex(ctx, inner, f);
      return ix;
    };
  }

  _onUpdate(update: Update<In>): () => void {
    if (update.type === UpdateType.ADD) {
      return this.add(update);
    } else if (update.type === UpdateType.UPDATE) {
      return this.update(update);
    } else if (update.type === UpdateType.DELETE) {
      return this.delete(update);
    } else {
      unreachable(update);
    }
  }
  
  add(update: AddUpdate<In>): () => void {
    const group = this.group(update.value);
    let ix = this.ixs.get(group);
    if (!ix) {
      ix = this.inner(this.ctx);
      this.ixs.set(group, ix);
    }
    // TODO: If the inner index throws a ConflictException, we should delete the
    // empty index.
    return ix._onUpdate(update);
  }

  update(update: UpdateUpdate<In>): () => void {
    const oldGroup = this.group(update.oldValue);
    const newGroup = this.group(update.newValue);
    if (oldGroup === newGroup) {
      const ix = this.ixs.get(oldGroup)!;
      return ix._onUpdate(update);
    } else {
      const oldIx = this.ixs.get(oldGroup)!;
      const newIx = this.ixs.get(newGroup)!;
      return () => {
        oldIx._onUpdate({
          id: update.id,
          type: UpdateType.DELETE,
          oldValue: update.oldValue,
        })();
        newIx._onUpdate({
          id: update.id,
          type: UpdateType.ADD,
          value: update.newValue,
        })();
      };
    }
  }

  delete(update: DeleteUpdate<In>): () => void {
    const group = this.group(update.oldValue);
    const ix = this.ixs.get(group)!;
    return ix._onUpdate(update);
    // TODO: When an index becomes empty, we can delete it.
  }
}

export const group = GroupedIndex.create;
