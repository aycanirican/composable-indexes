import { IndexContext } from "../core/Index";
import { Update, UpdateType } from "../core/Update";
import { unreachable } from "../util";
import { AggregateIndex, UnregisteredAggregateIndex } from "./AggregateIndex";

class FoldIndex<In, State, Return> extends AggregateIndex<In, Return> {
  private state: State;

  private constructor(
    ctx: IndexContext<any>,
    init: State,
    private readonly add: (state: State, value: In) => State,
    private readonly update: (
      state: State,
      oldValue: In,
      newValue: In
    ) => State,
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
  }): UnregisteredAggregateIndex<In, Return> {
    return new UnregisteredAggregateIndex(
      (ctx) =>
        new FoldIndex(
          ctx,
          args.init,
          args.add,
          args.update,
          args.delete,
          args.result
        )
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

  override value(): Return {
    return this.ret(this.state);
  }
}

export function foldIndex<In, State, Return>(args: {
  init: State;
  add: (state: State, value: In) => State;
  update: (state: State, oldValue: In, newValue: In) => State;
  delete: (state: State, oldValue: In) => State;
  result: (state: State) => Return;
}): UnregisteredAggregateIndex<In, Return> {
  return FoldIndex.create(args);
}

// Variations

export function groupIndex<State, Return>(args: {
  empty: State;
  append: (a: State, b: State) => State;
  inverse: (a: State) => State;
  result: (a: State) => Return;
}): UnregisteredAggregateIndex<State, Return> {
  return foldIndex({
    init: args.empty,
    add: args.append,
    update: (state, oldValue, newValue) =>
      args.append(state, args.append(args.inverse(oldValue), newValue)),
    delete: (state, oldValue) => args.append(state, args.inverse(oldValue)),
    result: args.result,
  });
}

export function sumIndex(): UnregisteredAggregateIndex<number, number> {
  return groupIndex({
    empty: 0,
    append: (a, b) => a + b,
    inverse: (a) => -a,
    result: (a) => a,
  });
}

export function arithmeticMeanIndex(): UnregisteredAggregateIndex<
  number,
  number
> {
  return groupIndex({
    empty: { sum: 0, count: 0 },
    append: (a, b) => ({ sum: a.sum + b.sum, count: a.count + b.count }),
    inverse: (a) => ({ sum: -a.sum, count: -a.count }),
    result: (a) => a.sum / a.count,
  }).premap((a) => ({ sum: a, count: 1 }));
}

export function countIndex(): UnregisteredAggregateIndex<any, number> {
  return foldIndex({
    init: 0,
    add: (st) => st + 1,
    update: (st) => st,
    delete: (st) => st - 1,
    result: (st) => st,
  })
}