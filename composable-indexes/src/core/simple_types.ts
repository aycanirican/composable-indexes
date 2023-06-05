import Long from "long";

export type Id = Long;

export class Item<T> {
  constructor(readonly id: Id, readonly value: T) {}
}

export interface Store<T> {
  get(id: Id): T | undefined;
}
