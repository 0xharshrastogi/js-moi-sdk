import type { JsonRpcResponse } from "./json-rpc";
import type { AbsoluteTesseractReference, RelativeTesseractReference } from "./moi-rpc-spec";
import type { IncludesLookup } from "./shared";

export interface Transport {
    request<TResult = unknown>(method: string, ...params: unknown[]): Promise<JsonRpcResponse<TResult>>;
}

/**
 * It is used to reference a tesseract either absolutely with
 * its unique hash or relatively through an account address and
 * height on that account.
 */
export type TesseractReference = AbsoluteTesseractReference["absolute"] | RelativeTesseractReference["relative"];

export type TesseractIncludes = IncludesLookup["moi.Tesseract"][];
