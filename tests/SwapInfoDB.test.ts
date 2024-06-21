import {SwapInfoDB} from "../src";


describe('getRoutesAndBaseInstructions', () => {
    it('should return the correct swap info', async () => {
        const theSwapInfo = {
            direct: true,
            inputMint: "inputMint",
            outputMint: "outputMint",
            remainingAccounts: [],
            routeLabels: ["routeLabel"],
            routeAmmkeys: ["routeAmmkey"],
            routeMints: ["inputMint", "outputMint"],
            decodedRoutePlan: [],
            addressLookupTableAddresses: []
        }
        const resA = await SwapInfoDB.remove(theSwapInfo);
        if (resA) {
            expect(SwapInfoDB.get(theSwapInfo)).toBeUndefined();
        }
        await SwapInfoDB.put(theSwapInfo);
        expect(SwapInfoDB.get(theSwapInfo)).toEqual(theSwapInfo);
        const resB = await SwapInfoDB.remove(theSwapInfo);
        expect(resB).toBeTruthy();
        expect(SwapInfoDB.get(theSwapInfo)).toBeUndefined();
    });
});
