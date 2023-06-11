import {
  Collection,
  btreeIndex,
  sumIndex,
  uniqueHashIndex,
  premap,
} from "composable-indexes";

// Here's the data type we want to index. Any type will do.
type Country = {
  name: string;
  population: number;
  peopleImprisoned: number;
};

// Everything revolves around two main types, a "Collection" and multiple
// "Index"es: A 'Collection' contains the actual data, and an 'Index' provides
// ways to query data in the collection.
const collection = new Collection<Country>();


// A collection can have any number of indexes. This library provides a few
// built-in indexes, and combinators to build new indexes from existing ones.
// You can also implement your own indexes that can be used just like the
// built-in ones.

// So let's add some indexes to our collection.

// Here's an index that lets us lookup countries by name. This index also
// ensures that there are no two countries with the same name. (We could've
// used `hashIndex` to allow duplicates.)
const lookupByName = collection.registerIndex(
  premap((c) => c.name, uniqueHashIndex())
);

// To clarify the above expression:
//
// A 'uniqueHashIndex' is an index that takes values of 'string | number'.
//
// The 'premap' combinator takes a function and an index, and returns a new
// index that apples the function to the values before passing them to the inner
// index. With this combinator, we can apply any index over a specific property of
// the collection.

// We can build indexes over computed values too. Say, we want to be able to
// access the country with the highest incarceration rate. A B-tree index is
// perfect for this.
const incarcerationRate = collection.registerIndex(
  premap((c) => c.peopleImprisoned / c.population, btreeIndex())
);

// And we can also build indexes that aggregate values across the collection.
const totalIncarceration = collection.registerIndex(
  premap((c) => c.peopleImprisoned, sumIndex())
);

// And values to collection
collection.add({
  name: "USA",
  population: 330_000_000,
  peopleImprisoned: 2_068_800,
});
collection.add({
  name: "Turkey",
  population: 83_000_000,
  peopleImprisoned: 291_198,
});
// ... rest of the countries omitted for brevity

// Use indexes
console.log(incarcerationRate.mapped.max1()?.value.name);
// prints: USA
console.log(totalIncarceration.mapped.value());
// prints: 4049998

// Modify values
collection.adjust(lookupByName.mapped.eq("Turkey")!.id, (c) => ({
  ...c,
  peopleImprisoned: 300_000,
}));
collection.add({
  name: "New Zealand",
  population: 5_000_000,
  peopleImprisoned: 8_397,
});

// Which updates the indexes
console.log(totalIncarceration.mapped.value()); // prints: 4_067_197
