import Long from "long";
import { LongMap } from "../util/LongMap";
import { Update, UpdateType } from "./Update";
import { Id } from "..";
import { Index, IndexContext, UnregisteredIndex } from "./Index";

export class Collection<T> {
  private last: Id = Long.UZERO;
  private store: LongMap<T> = new LongMap();

  private indexes: Index<T, T>[] = [];

  registerIndex<Ix extends Index<T, T>>(uIndex: UnregisteredIndex<T, T, Ix>): Ix {
    const ctx = new IndexContext(this.store);
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