`composable-indexes` are implemented in TypeScript, and focuses on type safety. So, understanding what the types mean helps a lot in understanding how to use the library.

Here are the main types:

# Collection

```typescript
class Collection<T> {}
```

Nothing interesting here. A `Collection` holds values of type `T`. It does not
have much assumptions about `T`. The most important warning here is that most of
the functionality expect `T` to not change outside of the `Collection` methods.
So, it is recommended to use the `Readonly<T>` type here.

# Index 

```typescript
abstract class Index<In, Out> {}
```

An `Index` represents a class of values that is kept up to date with the changes
happening in the underlying collection. At minimum it requires two type
parameters:

* `In`: The type of the values that the index is going to be applied on.
* `Out`: The type of the collection that this index belongs to. 

The subclasses normally has methods that is used to query the index. For
example, the `BTreeIndex` inherits from `Index`, and exposes a `range` method.

# UnregisteredIndex

```typescript
class UnregisteredIndex<In, Out, Ix extends Index<In, Out>> {}
```

An `UnregisteredIndex` is a description of an `Index` that is not yet
"registered" to a collection. You can pass an `UnregisteredIndex` to the
`Collection`'s `registerIndex` method to get your `Index`.

`UnregisteredIndex` is also the place where you compose the indexes. Functions
like `premap` and `group` work on `UnregisteredIndex`es.

# AggregateIndex

```typescript
abstract class AggregateIndex<In, Value> extends Index<In, never> {}
```

An `AggregateIndex` is a special kind of `Index` that is used to calculate
"aggregate values" from a collection. They don't return values from the
collection, so you don't see the `Out` type paremeter, but they always return a
single `Value`.

They can be constructed and composed more easily than ordinary `Index`'es.