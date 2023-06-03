import { Id, Index, UnregisteredIndex, Update } from "../Collection"

export class MockIndex<In, Out> extends Index<In, Out> {
    collectedUpdates: Update<In>[] = []
    _onUpdate(update: Update<In>): () => void {
        return () => {
            this.collectedUpdates.push(update)
        }
    }

    get(id: Id): Out | undefined {
        return this.indexContext.store.get(id)
    }

    static create<T, O>() : UnregisteredIndex<T, O, MockIndex<T, O>> {
        return (ctx) => new MockIndex(ctx)
    }
}