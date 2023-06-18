import Long from "long";
import {Id} from "../core/simple_types"

export class IdMap<T> {
    private map: Map<number, Map<number, T>> = new Map()

    get(key: Id): T | undefined {
        const m = this.map.get(key.asLong.high)
        if(m === undefined) {
            return undefined
        }
        return m.get(key.asLong.low)
    }

    set(key: Id, value: T) {
        let m = this.map.get(key.asLong.high)
        if(m === undefined) {
            m = new Map()
            this.map.set(key.asLong.high, m)
        }
        m.set(key.asLong.low, value)
    }

    delete(key: Id) {
        const m = this.map.get(key.asLong.high)
        if(m === undefined) {
            return
        }
        m.delete(key.asLong.low)

        if(m.size === 0) {
            this.map.delete(key.asLong.high)
        }
    }

    empty(): boolean {
        return this.map.size === 0
    }

    forEach(cb: (value: T, key: Id) => void) {
        for(const [id, v] of this.entries()) {
            cb(v, id)
        }
    }

    *entries(): Generator<[Id, T], void, unknown> {
        for(const [high, m] of this.map.entries()) {
            for(const [low, value] of m.entries()) {
                const id = Id.fromLong(Long.fromBits(low, high, true))
                yield [id, value]
            }
        }
    }
}

export class IdSet {
    private inner: IdMap<null> = new IdMap()

    static singleton(value: Id): IdSet {
        const set = new IdSet()
        set.set(value)
        return set
    }

    set(value: Id) {
        this.inner.set(value, null)
    }

    delete(value: Id) {
        this.inner.delete(value)
    }

    has(value: Id): boolean {
        return this.inner.get(value) !== undefined
    }

    empty(): boolean {
        return this.inner.empty()
    }

    forEach(cb: (value: Id) => void) {
        this.inner.forEach((_, key) => cb(key))
    }

    *values(): Generator<Id, void, unknown> {
        for(const [id] of this.inner.entries()) {
            yield id
        }
    }
}