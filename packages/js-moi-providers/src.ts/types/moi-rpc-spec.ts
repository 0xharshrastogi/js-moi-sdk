import type { AccountParam, ClientTesseractReferenceParam, IncludesParam, InteractionParam, MoiClientInfo } from "./shared";

interface RpcMethodLookup {
    "moi.Version": {
        params: [];
        response: MoiClientInfo;
    };
    "moi.Tesseract": {
        params: [Required<ClientTesseractReferenceParam> & IncludesParam<"moi.Tesseract">];
        response: unknown;
    };
    "moi.Interaction": {
        params: [InteractionParam];
        response: { ix_data: unknown };
    };
    "moi.Account": {
        params: [AccountParam & ClientTesseractReferenceParam & IncludesParam<"moi.Account">];
        response: { account_data: unknown };
    };
}

export type RpcMethod = keyof RpcMethodLookup;

export type RpcMethodParams<T> = T extends RpcMethod ? RpcMethodLookup[T]["params"] : unknown[];

export type RpcMethodResponse<T> = T extends RpcMethod ? RpcMethodLookup[T]["response"] : unknown;
