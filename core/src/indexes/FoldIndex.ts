import { IndexContext } from "../core/Index";
import { Update, UpdateType } from "../core/Update";
import { unreachable } from "../util";
import { AggregateIndex, UnregisteredAggregateIndex } from "./AggregateIndex";

/**
 * An aggregate index that folds over the change events it receives.
 * 
 * The time and memory complexity of this index completely depends on the
 * complexities of the functions passed to it.
 * 
 * @see {@link foldIndex} as a constructor.
 */
export class FoldIndex<In, State, Return> extends AggregateIndex<In, Return> {
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

/**
 * Create a new {@link FoldIndex}.
 */
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

/**
 * If the index forms an algebraic group, return the result of 
 * `append`ing all values.
 * 
 * Assuming `O(1)` `append` and `inverse`, this index has `O(1)`
 * memory and time complexity for queries and updates.
 */
export function algebraicGroupIndex<State, Return>(args: {
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

/**
 * An aggregate index for calculating the sum.
 * 
 * `O(1)` query, update, and memory complexity.
 */
export function sumIndex(): UnregisteredAggregateIndex<number, number> {
  return algebraicGroupIndex({
    empty: 0,
    append: (a, b) => a + b,
    inverse: (a) => -a,
    result: (a) => a,
  });
}

/**
 * An aggregate index for calculating the arithmetic mean.
 * 
 * `O(1)` query, update, and memory complexity.
 */
export function arithmeticMeanIndex(): UnregisteredAggregateIndex<
  number,
  number
> {
  return algebraicGroupIndex({
    empty: { sum: 0, count: 0 },
    append: (a, b) => ({ sum: a.sum + b.sum, count: a.count + b.count }),
    inverse: (a) => ({ sum: -a.sum, count: -a.count }),
    result: (a) => a.sum / a.count,
  }).premap((a) => ({ sum: a, count: 1 }));
}

/**
 * An aggregate index for calculating the number of values.
 * 
 * `O(1)` query, update, and memory complexity.
 */
export function countIndex(): UnregisteredAggregateIndex<any, number> {
  return foldIndex({
    init: 0,
    add: (st) => st + 1,
    update: (st) => st,
    delete: (st) => st - 1,
    result: (st) => st,
  })
}