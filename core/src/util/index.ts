export * from './IdMap'

export function unreachable(x: never): never {
    throw new Error("invariant violation: unreachable")
}