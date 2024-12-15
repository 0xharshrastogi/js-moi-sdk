import { randomBytes } from "@noble/hashes/utils";
import EventEmitter from "events";
import { bytesToHex } from "js-moi-utils";
import type { JsonRpcRequest, JsonRpcResponse } from "../types/json-rpc";
import type { Transport } from "../types/transport";
import { Websocket } from "../ws/ws";

type Websocketify<T extends JsonRpcRequest | JsonRpcResponse> = Omit<T, "id"> & { id: string };

export interface WebsocketTransportOptions {
    reconnect?: number;
}

export class WebsocketTransport extends EventEmitter implements Transport {
    private readonly options: WebsocketTransportOptions;

    private readonly address: string;

    private reconnects = 0;

    private ws?: Websocket;

    private waitForConnectionPromise?: Promise<void>;

    constructor(socket: string, options: WebsocketTransportOptions = {}) {
        super();

        if (!WebsocketTransport.isValidWebSocketUrl(socket)) {
            throw new Error("Invalid websocket url");
        }

        const err = WebsocketTransport.validateOptions(options);

        if (err != null) {
            throw err;
        }

        this.address = socket;
        this.options = options;

        this.createNewConnection();
    }

    protected createNewConnection(): void {
        this.ws = new Websocket(this.address, {});

        this.ws.onopen = (e) => {
            this.reconnects = 0;
            this.emit("open", e);
        };

        this.ws.onclose = (e) => {
            return this.emit("close", e);
        };

        this.ws.onmessage = (event) => this.emit("message", event.data);

        this.ws.onerror = (error) => {
            if (this.options.reconnect && this.reconnects < this.options.reconnect) {
                this.reconnects += 1;
                this.createNewConnection();
                this.waitForConnectionPromise = undefined;
                this.emit("reconnect", this.reconnects);
            }

            this.emit("error", error);
        };
    }

    private waitForConnection(): Promise<void> {
        this.waitForConnectionPromise ??= new Promise((resolve, reject) => {
            if (this.ws == null) {
                reject(new Error("Websocket is not initialized"));
                return;
            }

            if (this.ws.readyState === Websocket.CONNECTING) {
                const openListener = () => {
                    // If connection established, resolve the promise and
                    // remove listeners for closing and error events
                    this.off("close", closeListener);
                    this.off("error", errorListener);
                    resolve();
                };

                const closeListener = () => {
                    this.off("open", openListener);
                    reject(new Error("Websocket is closed"));
                };

                const errorListener = (error: Error) => {
                    this.off("open", openListener);
                    reject(error);
                };

                this.once("open", openListener);
                this.once("close", closeListener);
                this.once("error", errorListener);
                return;
            }

            if (this.ws.readyState === Websocket.OPEN) {
                return resolve();
            }

            if (this.options.reconnect && this.reconnects < this.options.reconnect) {
                return;
            }

            if (this.ws.CLOSED === Websocket.CLOSED || this.ws.CLOSING === Websocket.CLOSING) {
                throw new Error("Websocket is closed, cannot reconnect");
            }
        });

        return this.waitForConnectionPromise;
    }

    public async request<TResult = unknown>(method: string, params: unknown[]): Promise<JsonRpcResponse<TResult>> {
        await this.waitForConnection();

        const request: Websocketify<JsonRpcRequest> = this.createPayload(method, params);

        return new Promise((resolve, reject) => {
            const listener = (data: string) => {
                try {
                    const response = JSON.parse(data) as Websocketify<JsonRpcResponse>;

                    if (response.id !== request.id) {
                        return;
                    }

                    resolve({ ...response, id: 1 } as JsonRpcResponse<TResult>);
                    this.off("message", listener);
                } catch (error) {
                    reject(error);
                    this.off("message", listener);
                }
            };

            this.on("message", listener);
            this.send(request);
        });
    }

    private createPayload(method: string, params: unknown[]): Websocketify<JsonRpcRequest> {
        return {
            id: bytesToHex(randomBytes(32)),
            jsonrpc: "2.0",
            method,
            params,
        };
    }

    protected send(data: unknown): void {
        if (this.ws == null) {
            throw new Error("Websocket is not initialized");
        }

        this.ws?.send(JSON.stringify(data));
    }

    private static validateOptions(options: WebsocketTransportOptions): Error | null {
        if (options.reconnect != null && options.reconnect < 0) {
            return new Error("Reconnect must be a positive number");
        }

        return null;
    }

    private static isValidWebSocketUrl(url: string) {
        try {
            const parsedUrl = new URL(url);
            return parsedUrl.protocol === "ws:" || parsedUrl.protocol === "wss:";
        } catch (e) {
            return false;
        }
    }
}
