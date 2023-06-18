`composable-indexes` already comes with some built-in indexes. Here is a small
summary, with links to the relevant documentation:

* **{@link composable-indexes.BTreeIndex}**: An index useful for equality, range
  & maximum/minimum queries.
* **{@link composable-indexes.HashIndex}**: The most performant index for
  equality queries.
* **{@link composable-indexes.UniqueHashIndex}**: A hash index that enforces
  uniqueness.
* **{@link composable-indexes.premap}**: A combinator that allows you to apply
  another index to a field of a value.
* **{@link composable-indexes.group}**: A combinator that allows you to group
  values by a field, and apply another index to each group.
* **{@link composable-indexes.FoldIndex}**: An aggregate index that allows you
  to build the index from a reducer function over the changes to the collection.
* **{@link composable-indexes.algebraicGroupIndex}**: An aggregate index that is
  useful when the input forms [an algebraic
  group](https://en.wikipedia.org/wiki/Group_(mathematics)).
* **{@link composable-indexes.sumIndex}**: An aggregate index that sums the
  values of a field.
* **{@link composable-indexes.arithmeticMeanIndex}**: An aggregate index that
  calculates the arithmetic mean of the values of a field.
* **{@link composable-indexes.countIndex}**: An aggregate index that counts the
  number of values.