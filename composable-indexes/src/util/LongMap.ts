import Long from "long"

export class LongMap<T> {
    private map: Map<number, Map<number, T>> = new Map()

    get(key: Long): T | undefined {
        const m = this.map.get(key.high)
        if(m === undefined) {
            return undefined
        }
        return m.get(key.low)
    }

    set(key: Long, value: T) {
        let m = this.map.get(key.high)
        if(m === undefined) {
            m = new Map()
            this.map.set(key.high, m)
        }
        m.set(key.low, value)
    }

    delete(key: Long) {
        const m = this.map.get(key.high)
        if(m === undefined) {
            return
        }
        m.delete(key.low)

        if(m.size === 0) {
            this.map.delete(key.high)
        }
    }

    empty(): boolean {
        return this.map.size === 0
    }

    forEach(cb: (value: T, key: Long) => void) {
        for(const [id, v] of this.entries()) {
            cb(v, id)
        }
    }

    *entries(): Generator<[Long, T], void, unknown> {
        for(const [high, m] of this.map.entries()) {
            for(const [low, value] of m.entries()) {
                yield [Long.fromBits(low, high, true), value] as [Long, T]
            }
        }
    }
}

export class LongSet {
    private inner: LongMap<null> = new LongMap()

    static singleton(value: Long): LongSet {
        const set = new LongSet()
        set.set(value)
        return set
    }

    set(value: Long) {
        this.inner.set(value, null)
    }

    delete(value: Long) {
        this.inner.delete(value)
    }

    has(value: Long): boolean {
        return this.inner.get(value) !== undefined
    }

    empty(): boolean {
        return this.inner.empty()
    }

    forEach(cb: (value: Long) => void) {
        this.inner.forEach((_, key) => cb(key))
    }

    *values(): Generator<Long, void, unknown> {
        for(const [id] of this.inner.entries()) {
            yield id
        }
    }
}