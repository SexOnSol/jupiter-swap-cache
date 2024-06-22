import { RootDatabaseOptionsWithPath, open } from 'lmdb';
import { AccountMeta } from '@jup-ag/api';
import { RoutePlanStep } from '../program';

const _dbOptions: RootDatabaseOptionsWithPath = {
    path: ".data/SwapInfoDB",
    cache: { // https://github.com/kriszyp/weak-lru-cache#weaklrucacheoptions-constructor
        cacheSize: 16777216, // 16MB - maximum
        clearKeptInterval: 100,
        txnStartThreshold: 3
    },
	compression: false,
    encoding: 'msgpack',
    sharedStructuresKey: Symbol.for('SwapInfo'),
    eventTurnBatching: false,  // PERF: false. DEFAULT: true.

    // LMDB options
    noSync: false, // PERF: true. DEFAULT: false. NOTES: true = don't sync to disk, faster, could corrupt on crash.
    noMemInit: true, // PERF: true. DEFAULT: false. NOTES: true = don't zero-out disk space, faster but could be risky if the data is sensitive.
    remapChunks: false, // PERF: false. DEFAULT: true. NOTES: false = more ram usage, faster.
    useWritemap: false, // PERF: true. DEFAULT: false. NOTES: true = reduce malloc and file writes, risk of corrupting data, slower on Windows, faster on Linux.
}
const _db = open<SwapInfo>(_dbOptions);

export type SwapInfo = {
    direct: boolean,
    inputMint: string,
    outputMint: string,
    remainingAccounts: AccountMeta[],
    routeLabels: string[],
    routeAmmkeys: string[],
    routeMints: string[],
    decodedRoutePlan: RoutePlanStep[],
    addressLookupTableAddresses: string[],
    cacheUntil?: number,
}

type GetSwapInfoParams = {
    inputMint: string,
    outputMint: string,
    routeAmmkeys: string[]
}

const SwapInfoDB = {
    getMany: async (
        args: GetSwapInfoParams[]
    ): Promise<(SwapInfo|undefined)[]> => _db.getMany(
        args.map(arg => [arg.inputMint, arg.outputMint, arg.routeAmmkeys])
    ),
    
    get: (
        args: GetSwapInfoParams
    ): SwapInfo | undefined => _db.get([
        args.inputMint,
        args.outputMint,
        args.routeAmmkeys
    ]),

    put: async (
        swapInfo: SwapInfo
    ): Promise<boolean> => _db.put([
        swapInfo.inputMint,
        swapInfo.outputMint,
        swapInfo.routeAmmkeys
    ], swapInfo),

    remove: async (
        swapInfo: SwapInfo
    ): Promise<boolean> => _db.remove([
        swapInfo.inputMint,
        swapInfo.outputMint,
        swapInfo.routeAmmkeys
    ]),
}

export default SwapInfoDB;
