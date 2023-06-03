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
        this.map.forEach((m, high) => 
            m.forEach((value, low) => 
                cb(value, Long.fromBits(low, high))
            )
        )
    }
}