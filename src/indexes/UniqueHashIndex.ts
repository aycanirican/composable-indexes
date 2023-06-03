import {
  ConflictException,
  Id,
  Index,
  IndexContext,
  Item,
  UnregisteredIndex,
  Update,
  UpdateType,
} from "../Collection";
import { unreachable } from "../util";

export class UniqueHashIndex<In extends number | string, Out> extends Index<In, Out> {
  private readonly ix: Map<In, Id> = new Map();

  private constructor(ctx: IndexContext<Out>) {
    super(ctx);
  }

  static create<T extends number | string, O>(): UnregisteredIndex<T, O, UniqueHashIndex<T, O>> {
    return (ctx) => new UniqueHashIndex(ctx);
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
    const old = this.ix.get(value);

    if(old) {
      throw new ConflictException(old, this);
    }

    this.ix.set(value, id);
  }

  private update(id: Id, oldValue: In, newValue: In): void {
    this.ix.delete(oldValue);
    this.ix.set(newValue, id);
  }

  private delete(id: Id, oldValue: In): void {
    this.ix.delete(oldValue)
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

export function uniqueHashIndex<T extends string | number>(): UnregisteredIndex<T, T, UniqueHashIndex<T, T>> {
  return UniqueHashIndex.create();
}