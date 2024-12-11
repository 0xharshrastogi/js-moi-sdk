import { ErrorCode, ErrorUtils, isAddress, isHex, type Hex } from "js-moi-utils";

import type { JsonRpcResponse } from "./types/json-rpc.ts";
import type { ClientTesseractReference, RelativeTesseractOption, RpcMethod, RpcMethodParams, RpcMethodResponse } from "./types/moi-rpc-spec.d.ts";
import type { TesseractIncludes, TesseractReference, Transport } from "./types/provider.d.ts";
import type { MoiClientInfo } from "./types/shared.d.ts";

export class Provider {
    private readonly transport: Transport;

    public constructor(transport: Transport) {
        if (transport == null) {
            ErrorUtils.throwError("Transport is required", ErrorCode.INVALID_ARGUMENT);
        }

        this.transport = transport;
    }

    protected async execute<T extends RpcMethod>(method: T, ...params: RpcMethodParams<T>): Promise<RpcMethodResponse<T>> {
        const response = await this.transport.request<RpcMethodResponse<T>>(method, ...params);
        return Provider.processJsonRpcResponse(response);
    }

    public async request<T>(method: string, ...params: unknown[]): Promise<JsonRpcResponse<T>> {
        return await this.transport.request<T>(method, ...params);
    }

    /**
     * Retrieves the version and chain id of the MOI protocol network.
     *
     * @returns A promise that resolves to the Moi client version.
     */
    public async getVersion(): Promise<MoiClientInfo> {
        return await this.execute("moi.Version");
    }

    private async getTesseractByReference(reference: TesseractReference, includes: TesseractIncludes = []): Promise<unknown> {
        const ref = Provider.processTesseractReference(reference);
        return await this.execute("moi.Tesseract", ref, includes);
    }

    private async getTesseractByHash(tesseractHash: Hex, include?: TesseractIncludes): Promise<unknown> {
        return await this.getTesseractByReference(tesseractHash, include);
    }

    private async getTesseractByAddressAndHeight(address: Hex, height: number, include?: TesseractIncludes): Promise<unknown> {
        if (height < -1) {
            ErrorUtils.throwError("Invalid height value", ErrorCode.INVALID_ARGUMENT);
        }

        const ref: TesseractReference = { address, height };
        return await this.getTesseractByReference(ref, include);
    }

    /**
     * Retrieves a tesseract by its hash
     *
     * @param tesseractHash - The hash of the tesseract to retrieve.
     * @param include - The fields to include in the response.
     * @returns A promise that resolves to the tesseract.
     */
    public getTesseract(tesseractHash: Hex, include?: TesseractIncludes): Promise<unknown>;
    /**
     * Retrieves a tesseract by its address and height
     *
     * @param address - The address of the account that the tesseract is a part of.
     * @param height - The height of the tesseract on the account. The 0 & -1 values can be used to retrieve the oldest and latest tesseracts for the account respectively.
     * @param include - The fields to include in the response.
     *
     * @returns A promise that resolves to the tesseract.
     */
    public getTesseract(address: Hex, height: number, include?: TesseractIncludes): Promise<unknown>;
    /**
     * Retrieves a tesseract by its relative reference
     *
     * @param relativeRef - The relative reference of the tesseract to retrieve.
     * @param include - The fields to include in the response.
     *
     * @returns A promise that resolves to the tesseract.
     */
    public getTesseract(relativeRef: RelativeTesseractOption, include?: TesseractIncludes): Promise<unknown>;
    async getTesseract(hashOrAddress: Hex | RelativeTesseractOption, heightOrInclude?: number | TesseractIncludes, include?: TesseractIncludes): Promise<unknown> {
        if (typeof hashOrAddress === "object" && (heightOrInclude == null || Array.isArray(heightOrInclude))) {
            return await this.getTesseractByAddressAndHeight(hashOrAddress.address, hashOrAddress.height, heightOrInclude);
        }

        if (isAddress(hashOrAddress) && typeof heightOrInclude === "number") {
            return await this.getTesseractByAddressAndHeight(hashOrAddress, heightOrInclude, include);
        }

        if (isHex(hashOrAddress) && (heightOrInclude == null || Array.isArray(heightOrInclude))) {
            return await this.getTesseractByHash(hashOrAddress, heightOrInclude);
        }

        ErrorUtils.throwError("Invalid argument for method signature", ErrorCode.INVALID_ARGUMENT);
    }

    /**
     * Processes a JSON-RPC response and returns the result.
     * If the response contains an error, it throws an error with the provided message, code, and data.
     *
     * @template T - The type of the result expected from the JSON-RPC response.
     * @param {JsonRpcResponse<T>} response - The JSON-RPC response to process.
     * @returns {T} - The result from the JSON-RPC response.
     * @throws Will throw an error if the response contains an error.
     */
    public static processJsonRpcResponse<T>(response: JsonRpcResponse<T>): T {
        if ("error" in response) {
            const { data } = response.error;
            const params = data ? (typeof data === "object" ? data : { data }) : {};
            ErrorUtils.throwError(response.error.message, response.error.code, params);
        }

        return response.result;
    }

    /**
     * Processes a Tesseract reference and returns a `ClientTesseractReference`.
     *
     * @param reference - The Tesseract reference to process. It can be either an absolute or relative reference.
     * @returns A `ClientTesseractReference` object containing either an absolute or relative reference.
     */
    protected static processTesseractReference(reference: TesseractReference): ClientTesseractReference {
        if (isHex(reference)) {
            return { absolute: reference };
        }

        return { relative: reference };
    }
}