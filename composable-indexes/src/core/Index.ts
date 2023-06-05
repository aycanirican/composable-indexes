import { unreachable } from "../util";
import { AddUpdate, DeleteUpdate, Update, UpdateType, UpdateUpdate, mapUpdate } from "./Update";
import { Id, Item, Store } from "./simple_types";

export {Id, Item, Store}

export abstract class Index<In, Out> {
  protected constructor(readonly indexContext: IndexContext<Out>) {}
  abstract _onUpdate(update: Update<In>): () => void;

  protected item(id: Id): Item<Out> {
    return new Item(id, this.indexContext.store.get(id)!);
  }
}

// UnregisteredIndex

export class IndexContext<Out> {
  constructor(readonly store: Store<Out>) {}
}

export class UnregisteredIndex<In, Out, Ix extends Index<In, Out>> {
  constructor(readonly _register: (ctx: IndexContext<Out>) => Ix) {}
  focus<NewIn>(
    f: (x: NewIn) => In
  ): UnregisteredIndex<NewIn, Out, FocusedIndex<NewIn, Out, In, Ix>> {
    return FocusedIndex.create(f, this);
  }

  group<Group extends string | number>(
    f: (x: In) => Group
  ): UnregisteredIndex<In, Out, GroupedIndex<In, Out, Group, Ix>> {
    return GroupedIndex.create(f, this);
  }
}

export function focus<In, Out, InnerIn, Inner extends Index<InnerIn, Out>>(
    f: (_: In) => InnerIn,
    inner: UnregisteredIndex<InnerIn, Out, Inner>
): UnregisteredIndex<In, Out, FocusedIndex<In, Out, InnerIn, Inner>> {
    return inner.focus(f)
}

export function group<In, Out, Group extends string | number, Inner extends Index<In, Out>>(
    f: (_: In) => Group,
    inner: UnregisteredIndex<In, Out, Inner>
): UnregisteredIndex<In, Out, GroupedIndex<In, Out, Group, Inner>> {
    return inner.group(f)
}

// Focus functionality

export class FocusedIndex<
  In,
  Out,
  InnerIn,
  Inner extends Index<InnerIn, Out>
> extends Index<In, Out> {
  focused: Inner = this.inner;

  private constructor(
    ctx: IndexContext<Out>,
    private inner: Inner,
    private readonly f: (_: In) => InnerIn
  ) {
    super(ctx);
  }

  static create<In, Out, InnerIn, Inner extends Index<InnerIn, Out>>(
    f: (_: In) => InnerIn,
    inner: UnregisteredIndex<InnerIn, Out, Inner>
  ): UnregisteredIndex<In, Out, FocusedIndex<In, Out, InnerIn, Inner>> {
    return new UnregisteredIndex((ctx: IndexContext<Out>) => {
      const ix = new FocusedIndex(ctx, inner._register(ctx), f);
      return ix;
    });
  }

  _onUpdate(update: Update<In>): () => void {
    return this.inner._onUpdate(mapUpdate(this.f, update));
  }
}

// Group functionality

export class GroupedIndex<In, Out, Group extends string | number, Inner extends Index<In, Out>> extends Index<
  In,
  Out
> {
  private readonly ixs: Map<string | number, Inner> = new Map();

  private constructor(
    private readonly ctx: IndexContext<Out>,
    private readonly inner: UnregisteredIndex<In, Out, Inner>,
    private readonly group: (_: In) => Group
  ) {
    super(ctx);
  }

  static create<In, Out, Group extends string | number, Inner extends Index<In, Out>>(
    f: (_: In) => Group,
    inner: UnregisteredIndex<In, Out, Inner>
  ): UnregisteredIndex<In, Out, GroupedIndex<In, Out, Group, Inner>> {
    return new UnregisteredIndex((ctx: IndexContext<Out>) => {
      const ix = new GroupedIndex(ctx, inner, f);
      return ix;
    });
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

  private getOrCreateGroup(group: Group): Inner {
    let ix = this.ixs.get(group);
    if (!ix) {
      ix = this.inner._register(this.ctx);
      this.ixs.set(group, ix);
    }
    return ix
  }
  
  private add(update: AddUpdate<In>): () => void {
    const group = this.group(update.value);
    const ix = this.getOrCreateGroup(group);
    // TODO: If the inner index throws a ConflictException, we should delete the
    // empty index.
    return ix._onUpdate(update);
  }

  private update(update: UpdateUpdate<In>): () => void {
    const oldGroup = this.group(update.oldValue);
    const newGroup = this.group(update.newValue);
    if (oldGroup === newGroup) {
      const ix = this.ixs.get(oldGroup)!;
      return ix._onUpdate(update);
    } else {
      const oldIx = this.ixs.get(oldGroup)!;
      const newIx = this.getOrCreateGroup(newGroup);
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

  private delete(update: DeleteUpdate<In>): () => void {
    const group = this.group(update.oldValue);
    const ix = this.ixs.get(group)!;
    return ix._onUpdate(update);
    // TODO: When an index becomes empty, we can delete it.
  }

  where<T>(group: string | number): Inner | undefined {
    return this.ixs.get(group);
  }
}

