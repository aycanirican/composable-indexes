import { ConflictException, Id } from "..";
import {
  Index,
  IndexContext,
  UnregisteredIndex,
} from "../core/Index";
import { Update, UpdateType } from "../core/Update";
import { Item } from "../core/simple_types";
import { unreachable } from "../util";

export class UniqueHashIndex<In extends number | string, Out> extends Index<
  In,
  Out
> {
  private readonly ix: Map<In, Id> = new Map();

  private constructor(ctx: IndexContext<Out>) {
    super(ctx);
  }

  static create<T extends number | string, O>(): UnregisteredIndex<
    T,
    O,
    UniqueHashIndex<T, O>
  > {
    return new UnregisteredIndex((ctx) => new UniqueHashIndex(ctx));
  }

  _onUpdate(update: Update<In>): () => void {
    if (update.type === UpdateType.ADD && this.ix.has(update.value)) {
      throw new ConflictException(update.id, this);
    } else if (
      update.type === UpdateType.UPDATE &&
      this.ix.has(update.newValue)
    ) {
      throw new ConflictException(update.id, this);
    }

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
    this.ix.set(value, id);
  }

  private update(id: Id, oldValue: In, newValue: In): void {
    this.ix.delete(oldValue);
    this.ix.set(newValue, id);
  }

  private delete(id: Id, oldValue: In): void {
    this.ix.delete(oldValue);
  }

  // Queries
  countDistinct(): number {
    return this.ix.size;
  }

  eq(value: In): Item<Out> | undefined {
    const id = this.ix.get(value);
    return id ? this.item(id) : undefined;
  }
}

export function uniqueHashIndex<T extends string | number>(): UnregisteredIndex<
  T,
  T,
  UniqueHashIndex<T, T>
> {
  return UniqueHashIndex.create();
}
