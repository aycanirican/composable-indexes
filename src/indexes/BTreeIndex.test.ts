import test from 'node:test';
import { BTreeIndex, btreeIndex } from './BTreeIndex';
import fc from 'fast-check';
import { propIndexAgainstReference } from '../test_util/reference';
import { Item } from '../Collection';

test("BTreeIndex", async (t) => {
    await test('ref.eq', () => {
        fc.assert(
            propIndexAgainstReference<number, BTreeIndex<number, number>, Item<number>[]>({
                valueGen: fc.integer({ min: 0, max: 5}),
                index: btreeIndex(),
                value: (ix) => ix.eq(1).sort((a, b) => a.id.compare(b.id)),
                reference: (arr) => arr.filter(it => it.value === 1).sort((a, b) => a.id.compare(b.id))
            }),
            {
                numRuns: 10000
            }
        )
    }),

    await test('ref.max', () => {
        fc.assert(
            propIndexAgainstReference<number, BTreeIndex<number, number>, Item<number>[]>({
                valueGen: fc.integer({ min: 0, max: 5}),
                index: btreeIndex(),
                value: (ix) => ix.max().sort((a, b) => a.id.compare(b.id)),
                reference: (arr) => {
                    // Find the maximum value
                    const max = Math.max(...arr.map(it => it.value))
                    // Find all items with that value
                    return arr.filter(it => it.value === max).sort((a, b) => a.id.compare(b.id))
                }
            }),
            {
                numRuns: 10000
            }
        )
    })
})

