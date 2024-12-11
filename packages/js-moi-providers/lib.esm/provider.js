import { ErrorCode, ErrorUtils, isAddress, isHex } from "js-moi-utils";
export class Provider {
    transport;
    constructor(transport) {
        if (transport == null) {
            ErrorUtils.throwError("Transport is required", ErrorCode.INVALID_ARGUMENT);
        }
        this.transport = transport;
    }
    async execute(method, ...params) {
        const response = await this.transport.request(method, ...params);
        return Provider.processJsonRpcResponse(response);
    }
    async request(method, ...params) {
        return await this.transport.request(method, ...params);
    }
    /**
     * Retrieves the version and chain id of the MOI protocol network.
     *
     * @returns A promise that resolves to the Moi client version.
     */
    async getVersion() {
        return await this.execute("moi.Version");
    }
    async getTesseractByReference(reference, includes = []) {
        const ref = Provider.processTesseractReference(reference);
        return await this.execute("moi.Tesseract", ref, includes);
    }
    async getTesseractByHash(tesseractHash, include) {
        return await this.getTesseractByReference(tesseractHash, include);
    }
    async getTesseractByAddressAndHeight(address, height, include) {
        if (height < -1) {
            ErrorUtils.throwError("Invalid height value", ErrorCode.INVALID_ARGUMENT);
        }
        const ref = { address, height };
        return await this.getTesseractByReference(ref, include);
    }
    async getTesseract(hashOrAddress, heightOrInclude, include) {
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
    static processJsonRpcResponse(response) {
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
    static processTesseractReference(reference) {
        if (isHex(reference)) {
            return { absolute: reference };
        }
        return { relative: reference };
    }
}
//# sourceMappingURL=provider.js.map