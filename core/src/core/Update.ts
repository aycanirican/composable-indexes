import { unreachable } from "../util";
import { Id } from "./simple_types";

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

export function mapUpdate<From, To>(
  f: (a: From) => To,
  u: Update<From>
): Update<To> {
  switch (u.type) {
    case UpdateType.ADD:
      return {
        type: UpdateType.ADD,
        id: u.id,
        value: f(u.value),
      };
    case UpdateType.UPDATE:
      return {
        type: UpdateType.UPDATE,
        id: u.id,
        oldValue: f(u.oldValue),
        newValue: f(u.newValue),
      };
    case UpdateType.DELETE:
      return {
        type: UpdateType.DELETE,
        id: u.id,
        oldValue: f(u.oldValue),
      };
    default:
      unreachable(u);
  }
}


export function filterMapUpdate<From, To>(
  f: (a: From) => To | undefined,
  u: Update<From>
): Update<To> | undefined {
  switch (u.type) {
    case UpdateType.ADD:
      const i = f(u.value);
      if (i === undefined) {
        return undefined;
      }
      return {
        type: UpdateType.ADD,
        id: u.id,
        value: i,
      };
    case UpdateType.UPDATE:
      const old = f(u.oldValue);
      const new_ = f(u.newValue);

      if (old === undefined && new_ === undefined) {
        return undefined;
      } else if (old === undefined) {
        return {
          type: UpdateType.ADD,
          id: u.id,
          value: new_!,
        };
      } else if (new_ === undefined) {
        return {
          type: UpdateType.DELETE,
          id: u.id,
          oldValue: old!,
        };
      } else {
        return {
          type: UpdateType.UPDATE,
          id: u.id,
          oldValue: old!,
          newValue: new_!,
        };
      }
    case UpdateType.DELETE:
      const old_ = f(u.oldValue);
      if (old_ === undefined) {
        return undefined;
      }
      return {
        type: UpdateType.DELETE,
        id: u.id,
        oldValue: old_!,
      };
    default:
      unreachable(u);
  }
}
