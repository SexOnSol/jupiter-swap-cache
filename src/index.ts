import { DefaultApi, QuoteResponse } from "@jup-ag/api";
import { PublicKey } from "@solana/web3.js";
import lodash from "lodash";
import SwapInfoDB, { SwapInfo } from "./db/SwapInfoDB";
import { Route, createSwapInstruction, decodeSwapInstructionData } from "./program";
import { TempCacheDexes } from "./const";


/**
 * 
 * @param client v6 API client from `@jup-ag/api`
 * @param quote quote response from API
 * @param userPublicKey public key to send to API for swap instructions
 * @param useCache should the cache be used or bypassed entirely?
 * @param tempCacheDexes additional dexes to not cache permanently
 * @param tempCacheDuration duration in milliseconds to cache temp dexes
 * @returns 
 */
const getRoutesAndBaseInstructions = async (
    client: DefaultApi,
    quote: QuoteResponse,
    userPublicKey: PublicKey,
    useCache: boolean = true,
    tempCacheDexes: string[] = [],
    tempCacheDuration: number = 1000,
): Promise<SwapInfo> => {
    const now = Date.now();
    const _tempCacheDexes = lodash.uniq([...TempCacheDexes, ...tempCacheDexes]);
    const routeAmmkeys = quote.routePlan.map(step => step.swapInfo.ammKey);
    const routeLabels = quote.routePlan.map(step => step.swapInfo.label);
    const routeMints = lodash.uniq((
        quote.routePlan.map(route => ([
            route.swapInfo.inputMint,
            route.swapInfo.outputMint
        ]))
    ).flat());
    const isTempCache = lodash.find(routeLabels, _tempCacheDexes) !== undefined;
    const getCachedSwapInfo = () => {
        if (!useCache) {
            return undefined;
        }
        const swapInfo = SwapInfoDB.get({
            inputMint: quote.inputMint,
            outputMint: quote.outputMint,
            routeAmmkeys: routeAmmkeys
        })
        if (isTempCache && swapInfo?.cacheUntil && now > swapInfo?.cacheUntil) {
            return undefined;
        }
        return swapInfo;
    }
    const cachedSwapInfo = getCachedSwapInfo();
    if (cachedSwapInfo) {
        return cachedSwapInfo;
    }
    const swap = await client.swapInstructionsPost({
        swapRequest: {
            quoteResponse: quote,
            userPublicKey: userPublicKey.toString(),
            useSharedAccounts: false,
            wrapAndUnwrapSol: false,
            dynamicComputeUnitLimit: false,
            useTokenLedger: false,
            skipUserAccountsRpcCalls: true,
        }
    });
    const { inputMint, outputMint } = quote;
    try {
        const decoded = await decodeSwapInstructionData<Route["Arguments"]>(swap.swapInstruction.data);
        const res: SwapInfo = {
            direct: routeMints.length === 2,
            inputMint,
            outputMint,
            decodedRoutePlan: decoded.routePlan,
            routeMints,
            routeAmmkeys,
            routeLabels,
            remainingAccounts: swap.swapInstruction.accounts.slice(9),
            addressLookupTableAddresses: swap.addressLookupTableAddresses,
            cacheUntil: isTempCache ? now + tempCacheDuration : undefined,
        }
        if (useCache) {
            void SwapInfoDB.put(res);
        }
        return res;
    }
    catch (e) {
        return Promise.reject(e);
    }
}

export {
    createSwapInstruction,
    getRoutesAndBaseInstructions,
    SwapInfoDB
}
