import { Collection, btreeIndex } from "composable-indexes";

const collection = new Collection<number>();
const ixTree = collection.registerIndex(btreeIndex());

collection.add(1)
collection.add(2)

const ix = collection.add(3)
collection.delete(ix)

console.log(ixTree.max1()?.value) // prints: 2