import BN from "bn.js";
import { BorshCoder } from "@coral-xyz/anchor";
import { MethodsBuilder } from "@coral-xyz/anchor/dist/cjs/program/namespace/methods";
import { AllInstructions, IdlTypes } from "@coral-xyz/anchor/dist/cjs/program/namespace/types";
import { Keypair, PublicKey } from "@solana/web3.js";

import { program } from '@jup-ag/instruction-parser'

export const decoder = new BorshCoder(program.idl);
export type IDL = typeof program.idl;
export const eventAuthority = new PublicKey("D8cy77BBepLMngZx6ZukaTff5hCt1HrWyKk3Hnd9oitf");


export class InvalidRouteError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InvalidRoute";
    }
}

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


export const createSwapInstruction = async (
    accountsStrict: Route["AccountsStrict"],
    remainingAccounts: Route["RemainingAccounts"],
    routePlan: Route["Arguments"]["routePlan"],
    inAmount: Route["Arguments"]["inAmount"],
    quotedOutAmount: Route["Arguments"]["quotedOutAmount"],
    keypair: Keypair
) => (
    program.methods.route(
        routePlan,
        inAmount, // input amount
        quotedOutAmount, // output amount
        0, // slippage
        0, // platform fee
    )
        .accountsStrict(accountsStrict)
        .remainingAccounts(remainingAccounts)
        .signers([keypair])
).prepare();


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
