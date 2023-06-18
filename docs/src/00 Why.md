Most applications require a state to be maintained. This can be a simple cache
for a webserver, a complex data structure for a game, or a database for a
command line application.

There are many options for storing state. `composable-index` is one of them, and
it is useful when:

* Your data fits in memory, and do not need to persist it (or another
* You want a thin layer to represent your data and queries as plain JavaScript
  persistence mechanism).
  objects.
* You want to be able to query your data in multiple ways, without having to
  maintain multiple data structures or resort to iteration.
* (Bonus) You want to be able to query/aggregate your data in a customisable and
  performant way.

With `composable-index`, you can:

* Create and manipulate a collection of arbitrary values with plain JS (or TS)
  functions.
* Create "indexes" that can be used to query the collection with different
  criterias.
* Create "aggregations" that can be used to calculate values from the collection.

Those index and aggregations:

* Implemented with performant data structures.
* Stay in sync with the collection automatically.
* Can compose with combinators to create more complex indexes.

Example:

```typescript
import { Collection } from "composable-indexes";
import { group, premap, sumIndex, uniqueHashIndex } from "composable-indexes"

type Player = {
  name: string;
  score: number;
  alliance: string;
};

const collection = new Collection<Readonly<Player>>();

// Add indexes using ordinary TypeScript functions
const ixPlayersByName =
  collection.registerIndex(
    premap(
      (p) => p.name,
      uniqueHashIndex()
    )
  );

const ixTotalScoresPerAlliance =
  collection.registerIndex(
    group(
      (p) => p.alliance,
      premap(
        (p) => p.score,
        sumIndex()
      )
    )
  );

// Manipulate the collection
collection.add({ name: "Thor", score: 0, alliance: "Norse" });
collection.add({ name: "Cybele", score: 0, alliance: "Anatolia" });
collection.adjust(
    ixPlayersByName.get.eq("Cybele")!.id,
    (p) => ({ ...p, score: p.score + 10 })
);

// Query the collection
console.log(ixTotalScoresPerAlliance.get("Anatolia")!.get.value)
```