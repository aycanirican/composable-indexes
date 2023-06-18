import Long from "long";

export class Id {
  private constructor(readonly asLong: Long) {}

  static fromLong(long: Long): Id {
    return new Id(long);
  }

  equals(other: Id): boolean {
    return this.asLong.equals(other.asLong);
  }

  compare(other: Id): number {
    return this.asLong.compare(other.asLong);
  }
}

export class Item<T> {
  constructor(readonly id: Id, readonly value: T) {}
}

export interface Store<T> {
  get(id: Id): T | undefined;
}
