import { DefaultApi, QuoteResponse } from "@jup-ag/api";
import { PublicKey } from "@solana/web3.js";
import lodash from "lodash";
import SwapInfoDB, { SwapInfo } from "./db/SwapInfoDB";
import { DecodeInstructionError, Route, createSwapInstruction, decodeSwapInstructionData } from "./program";
import { TempCacheDexes } from "./const";


const getCachedSwapInfo = (
    quote: QuoteResponse,
    routeAmmkeys: string[]
) => {
    const swapInfo = SwapInfoDB.get({
        inputMint: quote.inputMint,
        outputMint: quote.outputMint,
        routeAmmkeys: routeAmmkeys
    })
    if (swapInfo?.cacheUntil && Date.now() > swapInfo?.cacheUntil) {
        return undefined;
    }
    return swapInfo;
}


const getRoutesAndBaseInstructions = async (
    client: DefaultApi,
    quote: QuoteResponse,
    userPublicKey: PublicKey,
    useCache: boolean = true,
    tempCacheDexes: string[] = [],
): Promise<SwapInfo> => {
    const _tempCacheDexes = lodash.uniq([...TempCacheDexes, ...tempCacheDexes]);
    const routeAmmkeys = quote.routePlan.map(step => step.swapInfo.ammKey);
    const routeLabels = quote.routePlan.map(step => step.swapInfo.label ? step.swapInfo.label : "Unknown");
    const routeMints = lodash.uniq((
        quote.routePlan.map(route => ([
            route.swapInfo.inputMint,
            route.swapInfo.outputMint
        ]))
    ).flat());
    const cachedSwapInfo = useCache ? getCachedSwapInfo(quote, routeAmmkeys) : undefined;
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
        const [decoded, isTempCache] = await Promise.all([
            decodeSwapInstructionData<Route["Arguments"]>(swap.swapInstruction.data),
            Promise.resolve(!useCache && lodash.find(routeLabels, _tempCacheDexes))
        ]);
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
            cacheUntil: isTempCache ? Date.now() + (60 * 1000) : undefined,
        }
        if (useCache) {
            void SwapInfoDB.put(res);
        }
        return res;
    }
    catch (e) {
        if (e instanceof DecodeInstructionError) {
            return Promise.reject(e);
        }
        return Promise.reject(e);
    }
}

export {
    createSwapInstruction,
    getRoutesAndBaseInstructions,
    SwapInfoDB
}
