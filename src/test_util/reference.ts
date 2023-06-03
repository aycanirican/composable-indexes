import fc from "fast-check";
import { Collection, Id, Index, UnregisteredIndex } from "../Collection";
import { Call, arbCalls } from "./arbitraries";
import { deepStrictEqual } from "assert";
import Long from "long";
import { MockIndex } from "./MockIndex";

interface Impl<T> {
    add(value: T): void;
    set(id: Id, value: T): void;
    delete(id: Id): void;
    toList(): [Id, T][];
}   

export class Reference<T> implements Impl<T> {
    private elems: [Id, T][] = []
    add(value: T) {
        for(let i=Long.UZERO;; i=i.add(1)) {
            if(this.elems.every(([j, _]) => i.notEquals(j))) {
                this.elems.push([i, value])
                return i
            }
        }            
    }

    set(id: Id, value: T): void {
        this.delete(id)
        this.elems.push([id, value])
    }
    delete(id: Id): void {
        this.elems = this.elems.filter(([i, _]) => i.notEquals(id))
    }
    toList(): [Id, T][] {
        return this.elems
    }
}

export function playCalls<T, C extends Impl<T>>(f: C, arr: Call<T>[]) {
    for(const call of arr) {
        switch(call.type) {
            case "add":
                f.add(call.value)
                break;
            case "set":
                f.set(call.id, call.value)
                break;
            case "delete":
                f.delete(call.id)
                break;
        }
    }
}

export function runCalls<T>(arr: Call<T>[]): [Id, T][] {
    const f = new Reference<T>()
    playCalls(f, arr)
    return f.toList()
}

export function assertIndexAgainstReference<T, Ix extends Index<T, T>, Ret>(args: {
    valueGen: fc.Arbitrary<T>,
    index: UnregisteredIndex<T, T, Ix>,
    value: (ix: Ix) => Ret,
    reference: (arrs: [Id, T][]) => Ret,
    examples?: [calls: Call<T>[]][]
}): void {
    return fc.assert(
        fc.property(
            arbCalls({
                value: args.valueGen,
                idRange: 10,
                maxLength: 100
            }),
            (calls) => {
                console.log("---")
                const col = new Collection<T>()

                const ix = col.registerIndex(args.index)
                const mockIx = col.registerIndex(MockIndex.create())

                console.log("calls", calls)
                playCalls(col, calls)
                console.log("updates", mockIx.collectedUpdates)

                const actual = args.value(ix)

                const expected = args.reference(runCalls(calls))

                deepStrictEqual(actual, expected)
                console.log("good.")
            }
        ),
        {
            numRuns: 1000000,
            examples: args.examples
        }
    )
}