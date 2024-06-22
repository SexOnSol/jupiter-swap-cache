/**
 * These are dexes that cannot be permanently stored in the cache because their
 * accounts change due to them using tick arrays, etc...
 * 
 * Perhaps at a later date we can find a way to store these in the cache, but
 * for now they are handled differently.
 */
export const TempCacheDexes = [
    "Whirlpool",
    "Meteora DLMM",
    "Raydium CLMM",
    "Raydium CP",
    "Cropper",
]
