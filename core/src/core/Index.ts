import { unreachable } from "../util";
import { AddUpdate, DeleteUpdate, Update, UpdateType, UpdateUpdate, filterMapUpdate } from "./Update";
import { Id, Item } from "./simple_types";

export abstract class Index<In, Out> {
  /** @internal */
  readonly _indexContext: IndexContext<Out>;

  protected constructor(ctx: IndexContext<Out>) {
    this._indexContext = ctx;
  }

  /** @internal */
  abstract _onUpdate(update: Update<In>): () => void;

  protected item(id: Id): Item<Out> {
    return new Item(id, this._indexContext.get(id)!);
  }
}

// UnregisteredIndex

export class IndexContext<Out> {
  constructor(readonly get: (_: Id) => Out | undefined) {}
}

export class UnregisteredIndex<In, Out, Ix extends Index<In, Out>> {
  /** @internal */
  readonly _register: (ctx: IndexContext<Out>) => Ix;

  /** @internal */
  constructor(_register: (ctx: IndexContext<Out>) => Ix) {
    this._register = _register;
  }
}

/**
 * Passes inputs through a function before handing them to the given index.
 * If the function returns `undefined`, the input is ignored.
 * 
 * @example
 * ```typescript
 * const collection = new Collection<Readonly<{
 *   name: string,
 *   age: number,
 * }>>();
 * 
 * // Ensure all names are unique
 * const ixUniqueNames = collection.registerIndex(
 *   premap(
 *     p.name,
 *     uniqueHashIndex()
 *   )
 * );
 * 
 * // Maintain the number of adults
 * const ixAdultCount = collection.registerIndex(
 *   premap(
 *     p => p.age >= 18 ? p : undefined,
 *     countIndex()
 *   )
 * );
 * 
 * console.log(ixAdultCount.get().value);
 */
export function premap<In, Out, InnerIn, Inner extends Index<InnerIn, Out>>(
    f: (_: In) => InnerIn | undefined,
    inner: UnregisteredIndex<InnerIn, Out, Inner>
): UnregisteredIndex<In, Out, PremapIndex<In, Out, InnerIn, Inner>> {
    return PremapIndex.create(f, inner);
}

/**
 * Groups input by a function and maintains a separate index for each group.
 * 
 * @example
 * ```typescript
 * const collection = new Collection<Readonly<{ 
 *  name: string,
 *  team: string,
 * }>>();
 * 
 * const ixTeamSizes = collection.registerIndex(
 *   group(
 *     (p) => p.team,
 *     countIndex()
 *   )
 * );
 * 
 * console.log(ixTeamSizes.get("Team One")?.value)
 */
export function group<In, Out, Group extends string | number, Inner extends Index<In, Out>>(
    f: (_: In) => Group,
    inner: UnregisteredIndex<In, Out, Inner>
): UnregisteredIndex<In, Out, GroupedIndex<In, Out, Group, Inner>> {
    return GroupedIndex.create(f, inner);
}

// Premap functionality

export class PremapIndex<
  In,
  Out,
  InnerIn,
  Inner extends Index<InnerIn, Out>
> extends Index<In, Out> {
  private constructor(
    ctx: IndexContext<Out>,
    private inner: Inner,
    private readonly f: (_: In) => InnerIn | undefined
  ) {
    super(ctx);
  }

  static create<In, Out, InnerIn, Inner extends Index<InnerIn, Out>>(
    f: (_: In) => InnerIn | undefined,
    inner: UnregisteredIndex<InnerIn, Out, Inner>
  ): UnregisteredIndex<In, Out, PremapIndex<In, Out, InnerIn, Inner>> {
    return new UnregisteredIndex((ctx: IndexContext<Out>) => {
      const ix = new PremapIndex(ctx, inner._register(ctx), f);
      return ix;
    });
  }

  _onUpdate(update: Update<In>): () => void {    
    const innerUpdate = filterMapUpdate(this.f, update);
    if (innerUpdate) {
      return this.inner._onUpdate(innerUpdate);
    } else {
      return () => {};
    }
  }

  get get(): Inner {
    return this.inner
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

  get<T>(group: string | number): Inner | undefined {
    return this.ixs.get(group);
  }

  /** Synonym for 'get' */
  where = this.get
}

