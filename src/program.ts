import BN from "bn.js";
import { BorshCoder } from "@coral-xyz/anchor";
import { MethodsBuilder } from "@coral-xyz/anchor/dist/cjs/program/namespace/methods";
import { AllInstructions, IdlTypes } from "@coral-xyz/anchor/dist/cjs/program/namespace/types";
import { Keypair, PublicKey } from "@solana/web3.js";

import { program } from '@jup-ag/instruction-parser'

export const decoder = new BorshCoder(program.idl);
export type IDL = typeof program.idl;
export const eventAuthority = new PublicKey("D8cy77BBepLMngZx6ZukaTff5hCt1HrWyKk3Hnd9oitf");


export class DecodeInstructionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "DecodeInstructionError";
    }
}

type _AllInstructions = AllInstructions<IDL>;
type _AllTypes = IdlTypes<IDL>;

type RemainingAccounts = Parameters<MethodsBuilder<IDL, _AllInstructions>["remainingAccounts"]>[0];
type AccountsStrict = Parameters<MethodsBuilder<IDL, _AllInstructions>["accountsStrict"]>[0];

export type RoutePlanStep = _AllTypes["RoutePlanStep"];


export type Route = {
    AccountsStrict: Pick<AccountsStrict,
        "tokenProgram" |
        "userTransferAuthority" |
        "userSourceTokenAccount" |
        "userDestinationTokenAccount" |
        "destinationTokenAccount" |
        "destinationMint" |
        "platformFeeAccount" |
        "eventAuthority" |
        "program"
    >;
    RemainingAccounts: RemainingAccounts;
    Arguments: {
        routePlan: RoutePlanStep[],
        inAmount: BN,
        quotedOutAmount: BN,
        slippageBps: number,
        platformFeeBps: number,
    }
}

/**
 * Create a swap instruction using `route` method from Jupiter v6.
 * @param accountsStrict 9 strict accounts
 * @param remainingAccounts remaining accounts
 * @param routePlan route plan
 * @param inAmount input amount
 * @param quotedOutAmount quoted output amount
 * @param keypair user keypair to sign
 * @param slippageBps slippage in bps, or 0
 * @param platformFeeBps platform fee in bps, or 0
 * @returns equivalent of `prepare` method from `@coral-xyz/anchor` using v6 route method
 */
export const createSwapInstruction = async (
    accountsStrict: Route["AccountsStrict"],
    remainingAccounts: Route["RemainingAccounts"],
    routePlan: Route["Arguments"]["routePlan"],
    inAmount: Route["Arguments"]["inAmount"],
    quotedOutAmount: Route["Arguments"]["quotedOutAmount"],
    keypair: Keypair,
    slippageBps?: Route["Arguments"]["slippageBps"],
    platformFeeBps?: Route["Arguments"]["platformFeeBps"],
) => (
    program.methods.route(
        routePlan,
        inAmount, // input amount
        quotedOutAmount, // output amount
        slippageBps | 0, // slippage
        platformFeeBps | 0, // platform fee
    )
        .accountsStrict(accountsStrict)
        .remainingAccounts(remainingAccounts)
        .signers([keypair])
).prepare();


/**
 * Decode the swap instruction data given by Jupiter v6 API.
 * @param data `swapInstruction.data` from Jupiter v6 API /swapInstructions POST response
 * @returns decoded swap instruction data as `T`
 */
export const decodeSwapInstructionData = async <T>(
    data: string,
): Promise<T> => {
    try {
        return decoder.instruction.decode(
            Buffer.from(data, "base64"),
            "base58"
        )?.data as T;
    } catch (e) {
        if (e.message.includes("Cannot read properties of null (reading 'property')")) {
            return Promise.reject(new DecodeInstructionError(`Failed to decode instruction data: ${data}. IDL possibly outdated.`));
        }
        return Promise.reject(e);
    }
}
