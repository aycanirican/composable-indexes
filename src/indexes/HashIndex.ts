import { inspect } from "node:util";
import {
  Id,
  Index,
  IndexContext,
  Item,
  UnregisteredIndex,
  Update,
  UpdateType,
} from "../Collection";
import { unreachable } from "../util";

export class HashIndex<In extends number | string, Out> extends Index<In, Out> {
  private readonly ix: Map<In, Set<Id>> = new Map();

  private constructor(ctx: IndexContext<Out>) {
    super(ctx);
  }

  static create<T extends number | string, O>(): UnregisteredIndex<T, O, HashIndex<T, O>> {
    return (ctx) => new HashIndex(ctx);
  }

  _onUpdate(update: Update<In>): () => void {
    return () => {
      console.log("HashIndex._onUpdate", update)
      if (update.type === UpdateType.ADD) {
        this.add(update.id, update.value);
      } else if (update.type === UpdateType.UPDATE) {
        this.update(update.id, update.oldValue, update.newValue);
      } else if (update.type === UpdateType.DELETE) {
        this.delete(update.id, update.oldValue);
      } else {
        unreachable(update);
      }

      console.log("HashIndex.debug", inspect(this.ix))
    };
  }

  private add(id: Id, value: In): void {
    const set = this.ix.get(value);
    if (set) {
      set.add(id);
    } else {
      this.ix.set(value, new Set([id]));
    }
  }

  private update(id: Id, oldValue: In, newValue: In): void {
    const oldSet = this.ix.get(oldValue);
    oldSet?.delete(id);
    this.add(id, newValue);
  }

  private delete(id: Id, oldValue: In): void {
    const set = this.ix.get(oldValue);
    set!.delete(id);
    if (set && set.size === 0) {
      this.ix.delete(oldValue);
    }
  }

  // Queries
  countDistinct(): number {
    return this.ix.size;
  }

  eq(value: In): Item<Out>[] {
    return this.items(this.ix.get(value));
  }

  // Utils
  private items(set: Set<Id> | undefined): Item<Out>[] {
    const ret: Item<Out>[] = [];

    if (!set) return ret;

    for (const id of set) {
      ret.push(this.item(id));
    }
    return ret;
  }
}

export function hashIndex<T extends string | number>(): UnregisteredIndex<T, T, HashIndex<T, T>> {
  return HashIndex.create();
}