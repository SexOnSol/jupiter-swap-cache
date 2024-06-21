# jupiter-swap-cache

> [!CAUTION]
> ALPHA SOFTWARE

Can cache all the data needed to recreate swap instructions, from the "quote" route plan ammkeys that match...

Some ammkeys can only be cached for short periods, due to the ephemeral nature of their account keys, such as whirlpool...

These are handled by the module, however you will probably need to handle some errors that occur in your code from time to time, that may require deleting specific swap datas.

You can either clear the whole db by deleting the .data folder, or delete invidivual swaps using the db directly.

## Example usage

A core component of `sexbot.sol`, some parts not included as they are proprietary, however the calls to `getRoutesAndBaseInstructions` can be seen, and from this the `executeSwapViaJito` function calls `createSwapInstruction` with the cached or new swap data.

`client` is essentially from v6 `jup-ag/api`

```typescript
export type ArbRoute = {
    arbMint: string,
    inAmount: BigNumber,
    expectedOutAmount: BigNumber,
    quoteA: QuoteResponse,
    quoteB: QuoteResponse,
}

const arbViaQuotes = async (
    client: DefaultApi,
    route: ArbRoute,
) => {
    const jitoTipValue = calculateTip(route.inAmount, route.expectedOutAmount, config.jito.tipPercentage, config.jito.minTip, config.jito.maxTip)
    const outAmount = route.inAmount.plus(config.minExtraAmount).plus(jitoTipValue).decimalPlaces(0)
    if (route.expectedOutAmount.isLessThanOrEqualTo(outAmount)) {
        throw new NotProfitableError();
    }
    const { quoteA, quoteB } = await normaliseQuoteInfo(route.quoteA, route.quoteB);
    const [swapInfoA, swapInfoB] = await Promise.all([
        getRoutesAndBaseInstructions(client, quoteA, keypair.publicKey, true, tempCacheDexes),
        getRoutesAndBaseInstructions(client, quoteB, keypair.PublicKey, true, tempCacheDexes),
    ]);
    if (!swapInfoA || !swapInfoB) {
        logger.warn("Failed to get swap info", { swapInfoA, swapInfoB });
        return;
    }
    const [routePlanA, routePlanB] = await createSingleInstructionArbRoute(swapInfoA.decodedRoutePlan, swapInfoB.decodedRoutePlan);
    await executeSwapViaJito(route.inAmount, outAmount, swapInfoA, swapInfoB, routePlanA, routePlanB, jitoTipValue);
}
```