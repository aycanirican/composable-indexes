import { Id, Index, Item, UnregisteredIndex, Update, UpdateType } from "../Collection"
import { inspect } from "node:util"

export class MockIndex<In, Out> extends Index<In, Out> {
    collectedUpdates: Update<In>[] = []
    elems: Item<In>[] = []

    _onUpdate(update: Update<In>): () => void {
        return () => {
            this.collectedUpdates.push(update)
            switch(update.type) {
                case UpdateType.ADD:
                    for (let i = 0; i < this.elems.length; i++) {
                        const it = this.elems[i];
                        if (it.id.equals(update.id)) {
                            throw new Error("invariant violation: Add already in set")
                        }
                    }
                    this.elems.push(new Item(update.id, update.value))   
                    break;
                case UpdateType.UPDATE:
                    for (let i = 0; i < this.elems.length; i++) {
                        const it = this.elems[i];
                        if (it.id.equals(update.id)) {
                            this.elems[i] = new Item(update.id, update.newValue)
                            return
                        }
                    }
                    throw new Error(`invariant violation: Update not in set. Update=${inspect(update)} elems=${inspect(this.elems)}`)
                case UpdateType.DELETE:
                    for (let i = 0; i < this.elems.length; i++) {
                        const it = this.elems[i];
                        if (it.id.equals(update.id)) {
                            this.elems.splice(i, 1)
                            return
                        }
                    }
                    throw new Error("invariant violation: Delete not in set")
            }
        }
    }

    get(id: Id): Out | undefined {
        return this.indexContext.store.get(id)
    }

    toInList(): Item<In>[] {
        return this.elems
    }

    toOutList(): Item<Out>[] {
        return this.elems.map((it) => new Item(it.id, this.get(it.id)!))
    }

    static create<T, O>() : UnregisteredIndex<T, O, MockIndex<T, O>> {
        return (ctx) => new MockIndex(ctx)
    }
}