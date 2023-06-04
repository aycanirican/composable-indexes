import {
  Index,
  IndexContext,
  UnregisteredIndex,
  Update,
  UpdateType,
} from "../Collection";
import { unreachable } from "../util";
import { FocusedIndex, focus } from "./FocusedIndex";

export class FoldIndex<In, Out, State, Return> extends Index<In, Out> {
  private state: State;

  private constructor(
    ctx: IndexContext<Out>,
    init: State,
    private readonly add: (state: State, value: In) => State,
    private readonly update: (state: State, oldValue: In, newValue: In) => State,
    private readonly del: (state: State, oldValue: In) => State,
    private readonly ret: (state: State) => Return
  ) {
    super(ctx);
    this.state = init;
  }

  static create<T, O, State, Return>(args: {
    init: State;
    add: (state: State, value: T) => State;
    update: (state: State, oldValue: T, newValue: T) => State;
    delete: (state: State, oldValue: T) => State;
    result: (state: State) => Return;
  }): UnregisteredIndex<T, O, FoldIndex<T, O, State, Return>> {
    return (ctx) =>
      new FoldIndex(
        ctx,
        args.init,
        args.add,
        args.update,
        args.delete,
        args.result
      );
  }

  _onUpdate(update: Update<In>): () => void {
    return () => {
      if (update.type === UpdateType.ADD) {
        this.state = this.add(this.state, update.value);
      } else if (update.type === UpdateType.UPDATE) {
        this.state = this.update(this.state, update.oldValue, update.newValue);
      } else if (update.type === UpdateType.DELETE) {
        this.state = this.del(this.state, update.oldValue);
      } else {
        unreachable(update);
      }
    };
  }

  result(): Return {
    return this.ret(this.state);
  }
}

export function foldIndex<T, State, Return>(args: {
  init: State;
  add: (state: State, value: T) => State;
  update: (state: State, oldValue: T, newValue: T) => State;
  delete: (state: State, oldValue: T) => State;
  result: (state: State) => Return;
}): UnregisteredIndex<T, T, FoldIndex<T, T, State, Return>> {
  return FoldIndex.create(args);
}

// Variations

export type GroupIndex<State, Return> = FoldIndex<State, any, State, Return>; 

export function groupIndex<State, Return>(args: {
  empty: State;
  mappend: (a: State, b: State) => State;
  inverse: (a: State) => State;
  result: (a: State) => Return;
}): UnregisteredIndex<State, any, GroupIndex<State, Return>> {
  return foldIndex({
    init: args.empty,
    add: args.mappend,
    update: (state, oldValue, newValue) =>
      args.mappend(state, args.mappend(args.inverse(oldValue), newValue)),
    delete: (state, oldValue) => args.mappend(state, args.inverse(oldValue)),
    result: args.result,
  });
}

export type SumIndex = GroupIndex<number, number>

export function sumIndex(): UnregisteredIndex<number, any, SumIndex> {
  return groupIndex({
    empty: 0,
    mappend: (a, b) => a + b,
    inverse: (a) => -a,
    result: (a) => a,
  })
}

type ArithmeticMeanState = { sum: number; count: number; };

export type ArithmeticMeanIndex = 
    FocusedIndex<
        number,
        any,
        ArithmeticMeanState,
        GroupIndex<ArithmeticMeanState, number>
    >

export function arithmeticMeanIndex(): UnregisteredIndex<
    number,
    number,
    ArithmeticMeanIndex
> {
  return focus(
    (t: number) => ({ sum: t, count: 1 }),
    groupIndex({
        empty: { sum: 0, count: 0 },
        mappend: (a, b) => ({ sum: a.sum + b.sum, count: a.count + b.count }),
        inverse: (a) => ({ sum: -a.sum, count: -a.count }),
        result: (a) => a.sum / a.count,
    })
  )
}
