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

// Workaround for https://github.com/qwertie/btree-typescript/issues/35
import BTree_ from "sorted-btree";
const BTree = (BTree_ as any).default as typeof BTree_;

export class BTreeIndex<In extends number | string, Out> extends Index<In, Out> {
  private readonly ix = new BTree<number | string, Set<Id>>();

  private constructor(ctx: IndexContext<Out>) {
    super(ctx);
  }

  static create<In extends number | string, Out>(): UnregisteredIndex<In, Out, BTreeIndex<In, Out>> {
    return (ctx) => new BTreeIndex(ctx);
  }

  _onUpdate(update: Update<In>): () => void {
    return () => {
      if (update.type === UpdateType.ADD) {
        this.add(update.id, update.value);
      } else if (update.type === UpdateType.UPDATE) {
        this.update(update.id, update.oldValue, update.newValue);
      } else if (update.type === UpdateType.DELETE) {
        this.delete(update.id, update.oldValue);
      } else {
        unreachable(update);
      }
    };
  }

  private add(id: Id, value: In): void {
    const set = this.ix.get(value);
    if (set !== undefined) {
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
    set?.delete(id);
    if (set && set.size === 0) {
      this.ix.delete(oldValue);
    }
  }

  // Queries
  countDistinct(): number {
    return this.ix.size;
  }

  eq(value: In): Item<Out>[] {
    return this.items(this.ix.get(value))
  }

  max(): Item<Out>[] {
    const maxKey = this.ix.maxKey();
    return this.items(maxKey ? this.ix.get(maxKey): undefined)
  }

  min(): Item<Out>[] {
    const minKey = this.ix.minKey();
    return this.items(minKey ? this.ix.get(minKey): undefined)
  }

  max1(): Item<Out> | undefined {
    const maxKey = this.ix.maxKey();
    return maxKey ? this.item(this.ix.get(maxKey)?.values().next().value) : undefined;
  }

  min1(): Item<Out> | undefined {
    const minKey = this.ix.minKey();
    return minKey ? this.item(this.ix.get(minKey)?.values().next().value) : undefined;
  }

  range(p: { minValue: In; maxValue: In; limit?: number }): Item<Out>[] {
    const { minValue, maxValue, limit } = p;
    const values = this.ix.getRange(minValue, maxValue, true, limit);

    const ret: Item<Out>[] = [];
    for (const [_, s] of values) {
      for (const id of s) {
        ret.push(this.item(id))
      }
    }

    return ret;
  }

  // utils
  private items(set: Set<Id> | undefined): Item<Out>[] {
    const ret: Item<Out>[] = [];

    if(!set) return ret;

    for (const id of set) {
      ret.push(this.item(id));
    }
    return ret;
  }
}

export function btreeIndex<In  extends number | string, Out>(): UnregisteredIndex<In, Out, BTreeIndex<In, Out>> {
  return BTreeIndex.create();
}