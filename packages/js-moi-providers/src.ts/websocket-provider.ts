import type { Hex } from "js-moi-utils";
import { Provider } from "./provider";
import { WebsocketTransport, type WebsocketTransportOptions } from "./transport/ws-transport";

export enum WebsocketEvent {
    Error = "error",
    Open = "open",
    Close = "close",
    Reconnect = "reconnect",
    Message = "message",
    NewPendingInteractions = "newPendingInteractions",
    NewTesseracts = "newTesseracts",
    NewTesseractsByAccount = "newTesseractsByAccount",
    NewLogs = "newLogs",
}

type BaseListener = (...args: any[]) => void;

export type ProviderEvent =
    | WebsocketEvent.Close
    | WebsocketEvent.Error
    | WebsocketEvent.Open
    | WebsocketEvent.Reconnect
    | WebsocketEvent.Message
    | WebsocketEvent.NewPendingInteractions
    | WebsocketEvent.NewTesseracts
    | { event: WebsocketEvent.NewTesseractsByAccount; params: [{ address: Hex }] }
    | { event: WebsocketEvent.NewLogs; params: [{ start_height: number; end_height: number; address: Hex; topics: any[] }] }
    | string
    | symbol;

type WebsocketEventListener<TEvent extends WebsocketEvent> = TEvent extends WebsocketEvent.NewPendingInteractions
    ? (hash: string) => void
    : TEvent extends WebsocketEvent.NewTesseracts | WebsocketEvent.NewTesseractsByAccount
    ? (tesseracts: {}) => void
    : TEvent extends WebsocketEvent.Reconnect
    ? (reconnects: number) => void
    : TEvent extends WebsocketEvent.Error
    ? (error: Error) => void
    : TEvent extends WebsocketEvent.Message
    ? (message: any) => void
    : TEvent extends WebsocketEvent.Open | WebsocketEvent.Close
    ? () => void
    : BaseListener;

type ProviderEventListener<TEvent extends ProviderEvent> = TEvent extends string
    ? TEvent extends WebsocketEvent
        ? WebsocketEventListener<TEvent>
        : BaseListener
    : TEvent extends symbol
    ? BaseListener
    : TEvent extends { event: infer TEventType }
    ? TEventType extends WebsocketEvent
        ? WebsocketEventListener<TEventType>
        : never
    : never;

type WebsocketEmittedResponse = {
    params: {
        subscription: string;
        result: unknown;
    };
};

export class WebsocketProvider extends Provider {
    private static events: Record<string, Set<string | symbol>> = {
        client: new Set(["error", "open", "close", "reconnect"]),
        internal: new Set(["message"]),
        network: new Set<string>(["newPendingInteractions", "newTesseracts", "newTesseractsByAccount", "newLogs"]),
    };

    private readonly subscriptions = new Map<string, ProviderEvent>();

    constructor(address: string, options?: WebsocketTransportOptions) {
        super(new WebsocketTransport(address, options));

        if (this.transport instanceof WebsocketTransport) {
            for (const event of WebsocketProvider.events.client) {
                this.transport.on(event, (...args) => this.emit(event, ...args));
            }
        }
    }

    close(): void {
        if (this.transport instanceof WebsocketTransport) {
            this.transport.close();
        }
    }

    private async handleOnNetworkEventSubscription(type: "on" | "once", event: ProviderEvent, listener: (...args: any[]) => void): Promise<void> {
        const params = typeof event === "object" ? event.params ?? [] : [];
        const eventName = WebsocketProvider.getEventName(event);
        const response = await this.request<string>("moi.subscribe", [eventName, ...params]);
        const id = WebsocketProvider.processJsonRpcResponse(response);
        const transport = this.transport as WebsocketTransport;

        super[type](eventName, listener);
        this.subscriptions.set(id, event);

        transport.on("message", (message: string) => {
            const data = JSON.parse(message);
            const isValidMessage = WebsocketProvider.isWebsocketEmittedResponse(data) && data.params.subscription === id;

            if (!isValidMessage) {
                return;
            }

            super.emit(eventName, data.params.result);
        });
    }

    on<K, T extends ProviderEvent>(event: T, listener: ProviderEventListener<T>): this {
        return this.subscribeToEvent<K>("on", event, listener);
    }

    once<K, T extends ProviderEvent>(eventName: T, listener: ProviderEventListener<T>): this {
        return this.subscribeToEvent<K>("once", eventName, listener);
    }

    private subscribeToEvent<K>(type: "on" | "once", event: ProviderEvent, listener: (...args: any[]) => void) {
        const eventName = WebsocketProvider.getEventName(event);

        if (WebsocketProvider.events.network.has(eventName)) {
            void this.handleOnNetworkEventSubscription(type, event, listener);
        } else {
            super[type](eventName, listener);
        }

        return this;
    }

    private static isWebsocketEmittedResponse(response: any): response is WebsocketEmittedResponse {
        return "params" in response && "subscription" in response.params && "result" in response.params;
    }

    private static getEventName(event: ProviderEvent): string | symbol {
        return typeof event === "object" ? event.event : event;
    }
}
