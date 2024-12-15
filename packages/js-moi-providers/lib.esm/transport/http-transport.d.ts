import type { JsonRpcRequest, JsonRpcResponse } from "../types/json-rpc";
import type { Transport } from "../types/transport";
export interface HttpTransportOption {
    debug?: (request: JsonRpcRequest, result: {
        success: boolean;
        cause?: unknown;
    }) => void;
}
export declare class HttpTransport implements Transport {
    private readonly host;
    private readonly option?;
    constructor(host: string, option?: HttpTransportOption);
    private createPayload;
    request<TResult = unknown>(method: string, params: unknown[]): Promise<JsonRpcResponse<TResult>>;
}
//# sourceMappingURL=http-transport.d.ts.map