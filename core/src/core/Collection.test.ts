import { strict as assert } from "node:assert";
import test from "node:test";
import { Collection } from "./Collection";
import { sumIndex, btreeIndex } from "../indexes";
import Long from "long";
import { MockIndex } from "../test_util/MockIndex";
import { UpdateType } from "./Update";
import { Id, Item } from "./simple_types";

test("Collection", async (t) => {
  await test("simple", () => {
    const c = new Collection();
    const ix = c.add(12);
    assert.strictEqual(c.get(ix), 12);
  });

  await test("delete", () => {
    const c = new Collection();
    const ix = c.add(12);
    assert.strictEqual(c.delete(ix), 12);
    assert.strictEqual(c.get(ix), undefined);
  });

  await test("update", () => {
    const c = new Collection();
    const ix = c.add(12);
    c.set(ix, 13);
    assert.strictEqual(c.get(ix), 13);
  });

  await test("delete non existent", () => {
    const c = new Collection<number>();
    const ix = c.add(12);
    assert.strictEqual(c.delete(ix), 12);
    assert.strictEqual(c.delete(ix), undefined);
  });

  await test("simple index", () => {
    const c = new Collection<number>();
    const ix1 = c.add(1);
    const sum = c.registerIndex(sumIndex());
    assert.strictEqual(sum.value(), 1);

    c.add(2);
    assert.strictEqual(sum.value(), 3);

    c.delete(ix1);
    assert.strictEqual(sum.value(), 2);

    const ix2 = c.add(5);
    assert.strictEqual(sum.value(), 7);

    c.set(ix2, 6);
    assert.strictEqual(sum.value(), 8);
  });

  await test("multiple indexes", () => {
    const c = new Collection<number>();

    const ix1 = c.registerIndex(sumIndex());
    const ix2 = c.registerIndex(btreeIndex());

    c.add(1);
    c.add(2);
    c.add(3);
    const maxId = c.add(10);
    c.add(9);
    c.add(8);

    assert.deepEqual(ix1.value(), 33);
    assert.deepEqual(ix2.max1(), new Item(maxId, 10));
  });

  await test("operations: add", () => {
    const c = new Collection<number>();
    const ix = c.registerIndex(MockIndex.create());

    c.add(1);

    assert.deepEqual(ix.collectedUpdates, [
      { type: UpdateType.ADD, id: Id.fromLong(Long.fromNumber(1, true)), value: 1 },
    ]);

    c.add(2);

    assert.deepEqual(ix.collectedUpdates, [
      { type: UpdateType.ADD, id: Id.fromLong(Long.fromNumber(1, true)), value: 1 },
      { type: UpdateType.ADD, id: Id.fromLong(Long.fromNumber(2, true)), value: 2 },
    ]);
  });

  await test("operations: update", () => {
    const c = new Collection<number>();
    const ix = c.registerIndex(MockIndex.create());

    const id = Id.fromLong(Long.fromNumber(1, true));

    c.set(id, 1);
    c.set(id, 2);

    assert.deepEqual(ix.collectedUpdates, [
      { type: UpdateType.ADD, id, value: 1 },
      { type: UpdateType.UPDATE, id, oldValue: 1, newValue: 2 },
    ]);
  });

  await test("operations: delete", () => {
    const c = new Collection<number>();
    const ix = c.registerIndex(MockIndex.create());

    const id = c.add(1);
    c.delete(id);

    assert.deepEqual(ix.collectedUpdates, [
      { type: UpdateType.ADD, id, value: 1 },
      { type: UpdateType.DELETE, id, oldValue: 1 },
    ]);

    // Deleting a non-existent item doesn't change anything
    c.delete(Id.fromLong(Long.fromNumber(666)));
    assert.deepEqual(ix.collectedUpdates, [
      { type: UpdateType.ADD, id, value: 1 },
      { type: UpdateType.DELETE, id, oldValue: 1 },
    ]);
  });
});
