import { Collection, btreeIndex, sumIndex, uniqueHashIndex, premap } from "composable-indexes";

type Country = {
  name: string;
  population: number;
  peopleImprisoned: number;
};

const collection = new Collection<Country>();

const lookupByName = collection.registerIndex(
  premap((c) => c.name, uniqueHashIndex())
);
const incarcerationRate = collection.registerIndex(
  premap((c) => c.peopleImprisoned / c.population, btreeIndex())
);
const worldwideIncarceration = collection.registerIndex(
  premap((c) => c.peopleImprisoned, sumIndex())
);

// And values to collection
collection.add({ name: "USA", population: 330_000_000, peopleImprisoned: 2_068_800 });
collection.add({ name: "Turkey", population: 83_000_000, peopleImprisoned: 291_198 });
// ... rest of the countries omitted for brevity

// Use indexes
console.log(incarcerationRate.mapped.max1()?.value.name);
    // prints: USA
console.log(worldwideIncarceration.mapped.value());
    // prints: 4049998

// Modify values
collection.adjust(
  lookupByName.mapped.eq("Turkey")!.id,
  (c) => ({ ...c, peopleImprisoned: 300_000 })
);
collection.add({ name: "New Zealand", population: 5_000_000, peopleImprisoned: 8_397 });

// Which updates the indexes
console.log(worldwideIncarceration.mapped.value()); // prints: 4_067_197
