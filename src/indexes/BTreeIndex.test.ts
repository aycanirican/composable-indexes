import test from 'node:test';
import { BTreeIndex, btreeIndex } from './BTreeIndex';
import fc from 'fast-check';
import { assertIndexAgainstReference } from '../test_util/reference';

test("BTreeIndex", async (t) => {
    await test.skip('ref', () => {
        assertIndexAgainstReference<number, BTreeIndex<number, number>, number | undefined>({
            valueGen: fc.integer(),
            index: btreeIndex(),
            value: (ix) => ix.max1()?.value,
            reference: (arr) => arr.length > 0 ? Math.max(...arr.map(([_, v]) => v)) : undefined
        })
    })
})

