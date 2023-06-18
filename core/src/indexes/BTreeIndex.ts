import { Id } from "..";
import {
  Index,
  UnregisteredIndex,
} from "../core/Index";
import { Update, UpdateType } from "../core/Update";
import { Item } from "../core/simple_types";
import { IdSet, unreachable } from "../util";
import BTree from "sorted-btree";

/** 
 * An index backed by a `BTree` (from the `sorted-btree` package).
 * 
 * Stores the elements in a sorted order, and allows efficient queries for
 * equality, range and max/min.
 * 
 * Memory footprint: `O(n * log(n))`
 * 
 * @group indexes 
 */
export class BTreeIndex<In extends number | string, Out> extends Index<In, Out> {
  private readonly ix = new BTree<number | string, IdSet>();

  static create<In extends number | string, Out>(): UnregisteredIndex<In, Out, BTreeIndex<In, Out>> {
    return new UnregisteredIndex((ctx) => new BTreeIndex(ctx));
  }

  /** @internal */
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
      set.set(id);
    } else {
      this.ix.set(value, IdSet.singleton(id));
    }
  }

  private update(id: Id, oldValue: In, newValue: In): void {
    if(oldValue === newValue) return

    // TODO: Lot's of redundant checks here, implement this more efficiently.
    this.delete(id, oldValue);
    this.add(id, newValue);
  }

  private delete(id: Id, oldValue: In): void {
    const set = this.ix.get(oldValue);
    set?.delete(id);
    if (set && set.empty()) {
      this.ix.delete(oldValue);
    }
  }

  // Queries

  /** 
   * Complexity: `O(1)`
   */
  countDistinct(): number {
    return this.ix.size;
  }

  /**
   * Complexity: `O(log(n))`
   */
  eq(value: In): Item<Out>[] {
    return this.items(this.ix.get(value))
  }

  /**
   * Returns all items that has the maximum value.
   * 
   * Complexity: `O(log(n) + m)`
   *   where `m` is the number of items fetched
   */
  max(): Item<Out>[] {
    const maxKey = this.ix.maxKey();
    if(maxKey === undefined) return []
    return this.items(this.ix.get(maxKey))
  }

  /**
   * Returns all items that has the minimum value.
   * 
   * Complexity: `O(log(n) + m)`
   *   where `m` is the number of items fetched
   */
  min(): Item<Out>[] {
    const minKey = this.ix.minKey();
    if(minKey === undefined) return []
    return this.items(this.ix.get(minKey))
  }

  /**
   * Complexity: `O(log(n))`
   */
  max1(): Item<Out> | undefined {
    const maxKey = this.ix.maxKey();
    if(maxKey === undefined) return
    const maxValues = this.ix.get(maxKey);
    for(const id of maxValues!.values()) {
      return this.item(id);
    }
  }

  /**
   * Complexity: `O(log(n))`
   */
  min1(): Item<Out> | undefined {
    const minKey = this.ix.minKey();
    if(minKey === undefined) return
    const minValues = this.ix.get(minKey);
    for(const id of minValues!.values()) {
      return this.item(id);
    }
  }

  /**
   * Returns at most `limit` items that is between `minValue` and `maxValue`
   * (inclusive).
   * 
   * Complexity: `O(log(n) + limit)`
   */
  range(p: { minValue: In; maxValue: In; limit?: number }): Item<Out>[] {
    const { minValue, maxValue, limit } = p;
    const values = this.ix.getRange(minValue, maxValue, true, limit);

    const ret: Item<Out>[] = [];
    for (const [_, s] of values) {
      for (const id of s.values()) {
        ret.push(this.item(id))
      }
    }

    return ret;
  }

  // utils
  private items(set: IdSet | undefined): Item<Out>[] {
    const ret: Item<Out>[] = [];

    if(!set) return ret;

    set.forEach((id) => {
      ret.push(this.item(id));
    })

    return ret;
  }
}

export function btreeIndex<In  extends number | string, Out>(): UnregisteredIndex<In, Out, BTreeIndex<In, Out>> {
  return BTreeIndex.create();
}