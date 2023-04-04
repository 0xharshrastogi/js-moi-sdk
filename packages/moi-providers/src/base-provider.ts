import { Address, bytesToHex, hexDataLength } from "moi-utils";
import { ErrorCode, Errors } from "moi-utils/src/errors";
import { decodeBase64 } from "../../moi-utils/src";
import { EventType, Listener } from "../types/event";
import { AccountMetaInfo, AccountParamsBase, AccountState, AssetInfo, AssetInfoParams, BalanceParams, ContextInfo, InteractionObject, InteractionReceipt, InteractionReceiptParams, InteractionResponse, LogicManifestParams, Options, RpcResponse, StorageParams, TDU, TesseractParams, Content, AccountStateParams, DBEntryParams } from "../types/jsonrpc";
import { AbstractProvider } from "./abstract-provider";
import Event from "./event";

const defaultTimeout: number = 120;

export class BaseProvider extends AbstractProvider {
    public _events: Array<Event>;

    _pollingInterval: number;
    _poller: NodeJS.Timer;
    _bootstrapPoll: NodeJS.Timer;

    public defaultOptions: Options = {
        tesseract_number: -1
    }

    constructor() {
        super();
        // Events being listened to
        this._events = [];

        this._pollingInterval = 4000;
    }

    private processResponse(response: RpcResponse): any {
        if(response.result) {
            if(response.result.data) {
                return response.result.data;
            }

            Errors.throwError(
                response.result.error.message, 
                ErrorCode.SERVER_ERROR,
            );
        }

        Errors.throwError(
            response.error.message, 
            ErrorCode.SERVER_ERROR,
        );
    }

    // Account Methods
    public async getBalance(address: string, assetId: string, options?: Options): Promise<number | bigint> {
        const params: BalanceParams = {
            from: address,
            assetid: assetId,
            options: options ? options : this.defaultOptions
        }

        const response: RpcResponse = await this.execute("moi.Balance", params);

        try {
            return this.processResponse(response)
        } catch (error) {
            throw error;
        }
    }

    public async getContextInfo(address: string, options?: Options): Promise<ContextInfo> {
        const params: AccountParamsBase = {
            from: address,
            options: options ? options : this.defaultOptions
        }

        const response: RpcResponse = await this.execute("moi.ContextInfo", params)

        try {
            return this.processResponse(response)
        } catch (error) {
            throw error;
        }
    }

    public async getTDU(address: string, options?: Options): Promise<TDU> {
        const params: AccountParamsBase = {
            from: address,
            options: options ? options : this.defaultOptions
        }

        const response: RpcResponse = await this.execute("moi.TDU", params)

        try {
            return this.processResponse(response)
        } catch (error) {
            throw error;
        }
    }

    public async getInteractionCount(address: string, options?: Options): Promise<number | bigint> {
        const params: AccountParamsBase = {
            from: address,
            options: options ? options : this.defaultOptions
        }

        const response: RpcResponse = await this.execute("moi.InteractionCount", params)

        try {
            return this.processResponse(response)
        } catch (error) {
            throw error;
        }
    }

    public async getPendingInteractionCount(address: string): Promise<number | bigint> {
        const params: AccountParamsBase = {
            from: address
        }

        const response: RpcResponse = await this.execute("moi.PendingInteractionCount", params)

        try {
            return this.processResponse(response)
        } catch (error) {
            throw error;
        }
    }

    public async getAccountState(address: string, options?: Options): Promise<AccountState> {
        const params: AccountStateParams = {
            address: address,
            options: options ? options : this.defaultOptions
        }

        const response: RpcResponse = await this.execute("moi.AccountState", params)

        try {
            return this.processResponse(response)
        } catch (error) {
            throw error;
        }
    }

    public async getAccountMetaInfo(address: string, options?: Options): Promise<AccountMetaInfo> {
        const params: AccountStateParams = {
            address: address,
            options: options ? options : this.defaultOptions
        }

        const response: RpcResponse = await this.execute("moi.AccountMetaInfo", params)

        try {
            return this.processResponse(response)
        } catch (error) {
            throw error;
        }
    }

    public async getContentFrom(address: string): Promise<any> {
        const params: AccountParamsBase = {
            from: address
        }

        const response: RpcResponse = await this.execute("ixpool.ContentFrom", params)

        try {
            return this.processResponse(response)
        } catch (error) {
            throw error;
        }
    }

    public async getWaitTime(address: string): Promise<number | bigint> {
        const params: AccountParamsBase = {
            from: address
        }

        const response: RpcResponse = await this.execute("ixpool.WaitTime", params)

        try {
            return this.processResponse(response)
        } catch (error) {
            throw error;
        }
    }

    public async getTesseract(address: string, with_interactions: boolean, options?: Options): Promise<any> {
        const params: TesseractParams = {
            from: address,
            with_interactions: with_interactions,
            options: options ? options : this.defaultOptions
        }

        const response: RpcResponse = await this.execute("moi.Tesseract", params)

        try {
            return this.processResponse(response)
        } catch (error) {
            throw error;
        }
    }

    // Execution Methods

    public async sendInteraction(ixObject: InteractionObject): Promise<InteractionResponse> {
        const response: RpcResponse = await this.execute("moi.SendInteractions", ixObject)

        try {
            if(response.result) {
                if(response.result.data) {
                    return {
                        hash: response.result.data,
                        wait: this.waitForInteraction.bind(this)
                    }
                }
    
                Errors.throwError(
                    response.result.error.message, 
                    ErrorCode.SERVER_ERROR,
                );
            }
    
            Errors.throwError(
                response.error.message, 
                ErrorCode.SERVER_ERROR,
            );
        } catch (error) {
            throw new Error("bad result form backend")
        }
    }

    // Query Methods

    public async getAssetInfoByAssetID(assetId: string): Promise<AssetInfo> {
        const params: AssetInfoParams = {
            asset_id: assetId
        }

        const response: RpcResponse = await this.execute("moi.AssetInfoByAssetID", params)

        try {
            return this.processResponse(response)
        } catch (error) {
            throw error;
        }
    }

    public async getInteractionReceipt(ixHash: string): Promise<InteractionReceipt> {
        const params: InteractionReceiptParams = {
            hash: ixHash
        }

        const response: RpcResponse = await this.execute("moi.InteractionReceipt", params)

        try {
            return this.processResponse(response)
        } catch (error) {
            throw error;
        }
    }

    public async getStorageAt(logicId: string, storageKey: string, options?: Options): Promise<any> {
        const params: StorageParams = {
            logic_id: logicId,
            "storage-key": storageKey,
            options: options ? options : this.defaultOptions
        }

        const response = await this.execute("moi.StorageAt", params)

        try {
            return this.processResponse(response)
        } catch (error) {
            throw error;
        }
    }

    public async getLogicManifest(logicId: string): Promise<string> {
        const params: LogicManifestParams = {
            logic_id: logicId,
            options: this.defaultOptions
        }

        const response: RpcResponse = await this.execute("moi.LogicManifest", params)

        try {
            const data = this.processResponse(response);
            const decodedManifest = decodeBase64(data);
            
            return bytesToHex(decodedManifest);
        } catch (error) {
            throw error;
        }
    }

    public async getContent(): Promise<Content> {
        const response: RpcResponse = await this.execute("ixpool.Content", null)

        try {
            return this.processResponse(response)
        } catch (error) {
            throw error;
        }
    }

    public async getStatus(): Promise<any> {
        const response: RpcResponse = await this.execute("ixpool.Status", null)

        try {
            return this.processResponse(response)
        } catch (error) {
            throw error;
        }
    }

    public async getInspect(): Promise<any> {
        const response: RpcResponse = await this.execute("ixpool.Inspect", null)

        try {
            return this.processResponse(response)
        } catch (error) {
            throw error;
        }
    }

    public async getPeers(): Promise<string[]> {
        const response: RpcResponse = await this.execute("net.Peers", null)

        try {
            return this.processResponse(response)
        } catch (error) {
            throw error;
        }
    }

    public async getDBEntry(key: string): Promise<any> {
        const params: DBEntryParams = {
            key: key
        }

        const response: RpcResponse = await this.execute("debug.DBGet", params)

        try {
            return this.processResponse(response)
        } catch (error) {
            throw error;
        }
    }

    public async getAccounts(): Promise<Address[]> {
        const response: RpcResponse = await this.execute("debug.GetAccounts", null)

        try {
            return this.processResponse(response)
        } catch (error) {
            throw error;
        }
    }

    public async waitForInteraction(interactionHash: string, timeout?: number): Promise<InteractionReceipt> {
        if(timeout == undefined) {
            timeout = defaultTimeout
        }

        return new Promise(async (resolve, reject) => {
            let intervalId: ReturnType<typeof setInterval>;
            let timeoutId: ReturnType<typeof setTimeout>;

            const checkReceipt = async() => {
                try {
                    const receipt = await this.getInteractionReceipt(interactionHash);
    
                    if(receipt) {
                        resolve(receipt)
                        clearInterval(intervalId)
                        clearTimeout(timeoutId)
                    }
                } catch(err) {

                }
            }

            await checkReceipt();

            intervalId = setInterval(checkReceipt, 5000)

            timeoutId = setTimeout(() => {
                clearInterval(intervalId);
                reject({message: "failed to fetch receipt"})
            }, timeout * 1000)
        })
    }

    public execute(method: string, params: any): Promise<any> {
        throw new Error(method + " not implemented")
    }

    public _startEvent(event: Event): void {
        this.polling = (this._events.filter((e) => e.pollable()).length > 0);
    }

    public _stopEvent(event: Event): void {
        this.polling = (this._events.filter((e) => e.pollable()).length > 0);
    }

    _addEventListener(eventName: EventType, listener: Listener, once: boolean): this {
        const event = new Event(getEventTag(eventName), listener, once)
        this._events.push(event);
        this._startEvent(event);

        return this;
    }

    on(eventName: EventType, listener: Listener): this {
        return this._addEventListener(eventName, listener, false);
    }

    once(eventName: EventType, listener: Listener): this {
        return this._addEventListener(eventName, listener, true);
    }

    emit(eventName: EventType, ...args: Array<any>): boolean {
        let result = false;

        let stopped: Array<Event> = [ ];

        let eventTag = getEventTag(eventName);
        this._events = this._events.filter((event) => {
            if (event.tag !== eventTag) { return true; }

            setTimeout(() => {
                event.listener.apply(this, args);
            }, 0);

            result = true;

            if (event.once) {
                stopped.push(event);
                return false;
            }

            return true;
        });

        stopped.forEach((event) => { this._stopEvent(event); });

        return result;
    }

    listenerCount(eventName?: EventType): number {
        if (!eventName) { return this._events.length; }

        let eventTag = getEventTag(eventName);
        return this._events.filter((event) => {
            return (event.tag === eventTag);
        }).length;
    }

    listeners(eventName?: EventType): Array<Listener> {
        if (eventName == null) {
            return this._events.map((event) => event.listener);
        }

        let eventTag = getEventTag(eventName);
        return this._events
            .filter((event) => (event.tag === eventTag))
            .map((event) => event.listener);
    }

    off(eventName: EventType, listener?: Listener): this {
        if (listener == null) {
            return this.removeAllListeners(eventName);
        }

        const stopped: Array<Event> = [ ];

        let found = false;

        let eventTag = getEventTag(eventName);
        this._events = this._events.filter((event) => {
            if (event.tag !== eventTag || event.listener != listener) { return true; }
            if (found) { return true; }
            found = true;
            stopped.push(event);
            return false;
        });

        stopped.forEach((event) => { this._stopEvent(event); });

        return this;
    }

    removeAllListeners(eventName?: EventType): this {
        let stopped: Array<Event> = [ ];
        if (eventName == null) {
            stopped = this._events;

            this._events = [ ];
        } else {
            const eventTag = getEventTag(eventName);
            this._events = this._events.filter((event) => {
                if (event.tag !== eventTag) { return true; }
                stopped.push(event);
                return false;
            });
        }

        stopped.forEach((event) => { this._stopEvent(event); });

        return this;
    }

    get polling(): boolean {
        return (this._poller != null);
    }

    set polling(value: boolean) {
        if (value && !this._poller) {
            this._poller = setInterval(() => { this.poll(); }, this.pollingInterval);

            if (!this._bootstrapPoll) {
                this._bootstrapPoll = setTimeout(() => {
                    this.poll();

                    // We block additional polls until the polling interval
                    // is done, to prevent overwhelming the poll function
                    this._bootstrapPoll = setTimeout(() => {
                        // If polling was disabled, something may require a poke
                        // since starting the bootstrap poll and it was disabled
                        if (!this._poller) { this.poll(); }

                        // Clear out the bootstrap so we can do another
                        this._bootstrapPoll = null;
                    }, this.pollingInterval);
                }, 0);
            }

        } else if (!value && this._poller) {
            clearInterval(this._poller);
            this._poller = null;
        }
    }

    async poll() {
        
    }

    get pollingInterval(): number {
        return this._pollingInterval;
    }

    set pollingInterval(value: number) {
        if (typeof(value) !== "number" || value <= 0 || parseInt(String(value)) != value) {
            throw new Error("invalid polling interval");
        }

        this._pollingInterval = value;

        if (this._poller) {
            clearInterval(this._poller);
            this._poller = setInterval(() => { this.poll(); }, this._pollingInterval);
        }
    }
}

function getEventTag(eventName: EventType): string {
    if (typeof(eventName) === "string") {
        eventName = eventName.toLowerCase();

        if (hexDataLength(eventName) === 32) {
            return "tx:" + eventName;
        }

        if (eventName.indexOf(":") === -1) {
            return eventName;
        }
    }

    throw new Error("invalid event - " + eventName);
}
