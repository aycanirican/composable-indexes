import Long from "long";
import { LongMap } from "./util/LongMap";

export type Id = Long;

export interface Store<T> {
    get(id: Id): T | undefined
}

export class Collection<T> {
  private last: Id = Long.UZERO;
  private store: LongMap<T> = new LongMap();

  private indexes: Index<T, T>[] = [];

  registerIndex<Ix extends Index<T, T>>(mkIndex: UnregisteredIndex<T, T, Ix>): Ix {
    const ctx = new IndexContext(this.store);
    const index = mkIndex(ctx);
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

  get(id: Id): T | undefined {
    return this.store.get(id);
  }

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

  set(id: Id, newValue: T): void {
    if(id.gt(this.last)) {
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

  alter<Ret>(id: Id, f: (pre: T | undefined) => [T | undefined, Ret]): Ret {
    const pre = this.store.get(id);

    if(pre) {
      this.store.delete(id)
    }

    const [post, ret] = f(pre);

    if(post) {  
      this.set(id, post)
      // TODO: Set function does another existence check, which is unnecessary
    }

    return ret
  }

  adjust(id: Id, f: (pre: T) => T): void {
    this.alter(id, (pre) => [pre ? f(pre) : undefined, undefined])
  }

  forEach(f: (value: T, id: Id) => void): void {
    this.store.forEach(f);
  }

  toList(): [Id, T][] {
    const ret: [Id, T][] = []
    this.forEach((value, id) => {
      ret.push([id, value])
    })
    return ret
  }

  private newId(): Id {
    this.last = this.last.add(Long.UONE);
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

export enum UpdateType {
  ADD,
  UPDATE,
  DELETE,
}

export type AddUpdate<T> = {
  readonly type: UpdateType.ADD;
  readonly id: Id;
  readonly value: T;
};

export type UpdateUpdate<T> = {
  readonly type: UpdateType.UPDATE;
  readonly id: Id;
  readonly oldValue: T;
  readonly newValue: T;
};

export type DeleteUpdate<T> = {
  readonly type: UpdateType.DELETE;
  readonly id: Id; 
  readonly oldValue: T;
};

export type Update<T> = AddUpdate<T> | UpdateUpdate<T> | DeleteUpdate<T>;

export abstract class Index<In, Out> {
  protected constructor(readonly indexContext: IndexContext<Out>) {}
  abstract _onUpdate(update: Update<In>): () => void;

  protected item(id: Long): Item<Out> {
    return new Item(id, this.indexContext.store.get(id)!);
  }
}

export class Item<T> {
  constructor(
    readonly id: Id,
    readonly value: T,
  ) {}
}

export class IndexContext<Out> {
  constructor(readonly store: Store<Out>) {}
}

export type UnregisteredIndex<In, Out, Ix extends Index<In, Out>> = (ctx: IndexContext<Out>) => Ix

// Utils

export class ConflictException<Out, Ix extends Index<any, Out>> extends Error {
  existingValue: Out

  constructor(readonly existingId: Id, readonly index: Ix) {
    super(`composable-indexes: Conflict with existing id ${existingId}`);
    this.existingValue = index.indexContext.store.get(existingId)!;
  }
}

export class ConditionFailedException<Ix extends Index<any, any>> extends Error {
  constructor(readonly message: string, readonly index: Ix) {
    super(`composable-indexes: Precondition failed: ${message}`);
  }
}