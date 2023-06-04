import {
  Index,
  IndexContext,
  UnregisteredIndex,
  Update,
  UpdateType,
} from "../Collection";
import { unreachable } from "../util";
import { FocusedIndex, focus } from "./FocusedIndex";

export class FoldIndex<In, State, Return> extends Index<In, any> {
  private state: State;

  private constructor(
    ctx: IndexContext<any>,
    init: State,
    private readonly add: (state: State, value: In) => State,
    private readonly update: (state: State, oldValue: In, newValue: In) => State,
    private readonly del: (state: State, oldValue: In) => State,
    private readonly ret: (state: State) => Return
  ) {
    super(ctx);
    this.state = init;
  }

  static create<In, State, Return>(args: {
    init: State;
    add: (state: State, value: In) => State;
    update: (state: State, oldValue: In, newValue: In) => State;
    delete: (state: State, oldValue: In) => State;
    result: (state: State) => Return;
  }): UnregisteredIndex<In, any, FoldIndex<In, State, Return>> {
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

export function foldIndex<In, Out, State, Return>(args: {
  init: State;
  add: (state: State, value: In) => State;
  update: (state: State, oldValue: In, newValue: In) => State;
  delete: (state: State, oldValue: In) => State;
  result: (state: State) => Return;
}): UnregisteredIndex<In, Out, FoldIndex<In, State, Return>> {
  return FoldIndex.create(args);
}

// Variations

export type GroupIndex<State, Return> = FoldIndex<State, State, Return>; 

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
