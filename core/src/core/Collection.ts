import Long from "long";
import { IdMap } from "../util/IdMap";
import { Update, UpdateType } from "./Update";
import { Id } from "..";
import { Index, IndexContext, UnregisteredIndex } from "./Index";

/**
 * Maintains a collection of items, and keeps the registered indexes up to date.
 * 
 * @typeParam T - The type of the items in the collection. It is recommended to
 * use a read-only type here.
 * 
 * @example
 * ```typescript
 * import { Collection } from "composable-indexes";
 * type Person = { name: string, age: number };
 * const collection = new Collection<Readonly<Person>>();
 * ```
 */
export class Collection<T> {
  private last: Id = Id.fromLong(Long.UZERO);
  private store: IdMap<T> = new IdMap();

  private indexes: Index<T, T>[] = [];

  /**
   * Creates an empty collection.
   */
  constructor() {}

  /**
   * Registers an {@link UnregisteredIndex} to a collection, returning the
   * {@link Index} that can be used to query the collection.
   * 
   * You likely want to use this before you populate the collection, as it needs
   * to iterate over all the existing items in the collection to build the index.
   * 
   * Complexity: O(n) where n is the number of items already in the collection.
   */
  registerIndex<Ix extends Index<T, T>>(uIndex: UnregisteredIndex<T, T, Ix>): Ix {
    const ctx = new IndexContext((id) => this.store.get(id));
    const index = uIndex._register(ctx);
    this.store.forEach((elem, id) => {
      index._onUpdate({
        type: UpdateType.ADD,
        id,
        value: elem,
      })();
    });
    this.indexes.push(index);
    return index;
  }

  /**
   * @group Queries
   */
  get(id: Id): T | undefined {
    return this.store.get(id);
  }

  /**
   * Complexity: O(1)
   * 
   * @param value Value to add the collection
   * @returns An {@link Id} that can be used to refer to the added value.
   * @group Mutations
   */
  add(value: T): Id {
    const id = this.newId();

    this.store.set(id, value);
    this.propagateUpdate({
      type: UpdateType.ADD,
      id,
      value,
    });

    return id;
  }

  /**
   * Complexity: O(1)
   * 
   * @param value {@link Id} of the item to delete
   * @returns The deleted value, or `undefined` if doesn't exist.
   * @group Mutations
   */
  delete(id: Id): T | undefined {
    const oldValue = this.store.get(id);

    if (oldValue === undefined) {
      return undefined;
    }

    this.store.delete(id);
    this.propagateUpdate({
      type: UpdateType.DELETE,
      id,
      oldValue,
    });

    return oldValue;
  }

  /**
   * Creates or updates a item in the collection.
   * 
   * Complexity: O(1)
   * @group Mutations
   */
  set(id: Id, newValue: T): void {
    if(id.asLong.gt(this.last.asLong)) {
      this.last = id
    }

    const oldValue = this.store.get(id);
    this.store.set(id, newValue);

    const update: Update<T> =
      oldValue === undefined
        ? {
            type: UpdateType.ADD,
            id,
            value: newValue,
          }
        : {
            type: UpdateType.UPDATE,
            id,
            oldValue,
            newValue,
          };

    this.propagateUpdate(update);
  }

  /**
   * Most generic way to update an item in the collection. 
   * 
   * Complexity: O(1)
   * 
   * @param f Takes either the existing value, or `undefined` if it doesn't
   * exist, and returns a tuple of the new value and the return value.
   * If the new value is `undefined`, existing item is deleted.
   * @throws {@link ConflictException} if the index invariant is violated
   * @throws {@link ConditionFailedException} if the precondition fails
   * @group Mutations
   */
  alter<Ret>(id: Id, f: (pre: T | undefined) => [T | undefined, Ret]): Ret {
    const pre = this.get(id);
    if(pre) {
      this.delete(id)
    }

    const [post, ret] = f(pre);
    if(post) {  
      this.set(id, post)
      // TODO: Set function does another existence check, which is unnecessary
    }
    
    return ret
  }

  /**
   * Updates a value in the collection, if it exists. 
   * 
   * Complexity: O(1)
   * @group Mutations
   */
  adjust(id: Id, f: (pre: T) => T): void {
    this.alter(id, (pre) => [pre ? f(pre) : undefined, undefined])
  }

  /**
   * @group Queries
   */
  forEach(f: (value: T, id: Id) => void): void {
    this.store.forEach(f);
  }

  /**
   * @group Queries
   */
  toList(): [Id, T][] {
    const ret: [Id, T][] = []
    this.forEach((value, id) => {
      ret.push([id, value])
    })
    return ret
  }

  private newId(): Id {
    this.last = Id.fromLong(this.last.asLong.add(Long.UONE));
    return this.last;
  }

  private propagateUpdate(update: Update<T>): void {
    const commitHooks = [];
    for (const index of this.indexes) {
      const hook = index._onUpdate(update);
      commitHooks.push(hook);
    }
    for (const hook of commitHooks) {
      hook();
    }
  }
}

// Utils

export class ConflictException<Out, Ix extends Index<any, Out>> extends Error {
  existingValue: Out

  constructor(readonly existingId: Id, readonly index: Ix) {
    super(`composable-indexes: Conflict with existing id ${existingId}`);
    this.existingValue = index._indexContext.get(existingId)!;
  }
}

export class ConditionFailedException<Ix extends Index<any, any>> extends Error {
  constructor(readonly message: string, readonly index: Ix) {
    super(`composable-indexes: Precondition failed: ${message}`);
  }
}