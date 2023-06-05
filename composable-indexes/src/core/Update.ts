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
  
  export function mapUpdate<From, To>(f: (a: From) => To, u: Update<From>): Update<To> {
    switch (u.type) {
      case UpdateType.ADD:
        return {
          type: UpdateType.ADD,
          id: u.id,
          value: f(u.value)
        }
      case UpdateType.UPDATE:
        return {
          type: UpdateType.UPDATE,
          id: u.id,
          oldValue: f(u.oldValue),
          newValue: f(u.newValue)
        }
      case UpdateType.DELETE:
        return {
          type: UpdateType.DELETE,
          id: u.id,
          oldValue: f(u.oldValue)
        }
      default:
        unreachable(u)
    }
  } 
  