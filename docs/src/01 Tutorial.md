Let's go through the main features of the library. As an example, we will model 
a scoreboard for a game, where we want to be able to dynamically update scores
of players, and query different aspects of the scoreboard.

First, let's start with some imports:

`composable-index` has two main concepts: `Collection` and `Index`.

# Collection

A `Collection` is a container for values. It can have any number of `Index`'es
that can be used to query the values in the collection.

Creating a collection is as simple as it gets:

```typescript
import { Collection } from "composable-indexes";

type Player = {
  name: string;
  score: number;
  alliance: string;
};

const collection = new Collection<Readonly<Player>>();
```

> Any type would do, but note that we've used `Readonly` here. This is because we
are supposed to use the methods of the `Collection` class to modify the values,
and it is not safe to modify them directly. `Readonly` class ensures this.

Once we have a `Collection`, we can use it to add values:

```typescript
collection.add({ name: "Thor", score: 0, alliance: "Norse" })
```

Every value in the collection is assigned a unique ID. We can use this ID to 
modify the value:

```typescript
const cybele = collection.add({ name: "Cybele", score: 0, alliance: "Anatolia" })
collection.adjust(cybele, (p) => ({ ...p, score: p.score + 10 }))

console.log(collection.get(cybele)!.score)
  // prints: 10
```

# Index

In order to run more interesting queries on a collection, we need to add some
indexes. Here is a simple one that lets us lookup players by name:

```typescript
import { premap, uniqueHashIndex } from "composable-indexes";

const lookupByName = collection.registerIndex(
  premap(
    (p) => p.name,
    uniqueHashIndex()
  )
);
```

A couple of things going on here:

* `registerIndex` is a method of the `Collection` class. It takes an
  `UnregisteredIndex`, and returns an `Index`. The `UnresgisteredIndex` is a
  _description_ of the index we want, and the resulting `Index` is the one we
  can use to query the collection.
* An `uniqueHashIndex` is one of the built-in indexes. It is an index that
  allows us to lookup exact values. It is also a _unique_ index, meaning that it
  will not allow us to add two values with the same key.
* An `uniqueHashIndex` indexes fields of type `string`, but our collection has
  `Player`'s instead. This is where the `premap` combinator comes in. `premap`
  is a combinator that builds an index based on the result of a function.
  * If you are into functional programming, you can think of combinators like
    `premap` as "higher order indexes".

With our index built and registered, we can now query our collection with it:

```typescript
console.log(lookupByName.get.eq("Cybele")?.value.score)
  // prints: 10
console.log(lookupByName.get.eq("Thor")?.value.score)
  // prints: 0
console.log(lookupByName.get.eq("Zeus"))
  // prints: undefined
```

Let's add some more indexes.

Say, we want to build an "Alliance Leaderboard", where we want to see the total
scores of each alliance.

```typescript
import { group, sumIndex } from "composable-indexes";

const lookupAllianceScore =
  collection.registerIndex(
    group(
      (p) => p.alliance,
      premap(
        (p) => p.score,
        sumIndex()
      )
    )
  );

console.log(lookupAllianceScore.get("Anatolia")?.get.value)
  // prints 10

// Let's add another player to the alliance.
collection.add({ name: "Ishtar", score: 5, alliance: "Anatolia" })

// And see the alliance score update:
console.log(lookupAllianceScore.get("Anatolia")?.get.value)
  // prints 15
```

This introduces a couple of new concepts:

* A `group` combinator takes a grouping key, and indexes all those groups
  separately.
  * It is similar to SQL `GROUP BY` expression.
* A `sumIndex` is an index that stores the sum of indexed values.
  * Notice that this index is not used to lookup values from a collection, but
    instead return a value. We call these an `AggregateIndex`. 

> **What is with all the `get`'s?**
>
> You might have noticed that we are using `get` a lot. This is because when we "wrap" an index
> with a combinator like `group` or `premap`, we need to "extract" the wrapped index at the use site.
>
> It is a good practice to wrap your index query with a function, so you decouple the meaning of your
> query from how it is implemented. Example:
>
> ```typescript
> function getTotalAllianceScore(alliance: string): number {
>    return lookupAllianceScore.get(alliance)?.get.value;
> } 
> ```

This is pretty much it! You can now build your own indexes and queries