import * as _ from 'lodash';
import { Iterators } from 'fabric-shim';
import { KeyModificationItem, KV } from '../index';
import { Helpers } from './helpers';
import { LoggerInstance } from 'winston';

/**
 * The Transform class is a helper to provide data transformation to and from the formats required by hyperledger fabric.
 */
export class Transform {
    public static logger: LoggerInstance = Helpers.getLoggerInstance('Transform', 'info');

    /**
     * serialize payload
     *
     * @static
     * @param {*} value
     * @returns
     * @memberof Transform
     */
    public static serialize(value: any) {
        if (value instanceof Buffer) {
            return value;
        } else if (_.isDate(value) || _.isString(value)) {
            return Buffer.from(this.normalizePayload(value).toString());
        }

        return Buffer.from(JSON.stringify(this.normalizePayload(value)));
    }

    /**
     * parse string to object
     *
     * @static
     * @param {Buffer} buffer
     * @returns {(object | undefined)}
     * @memberof Transform
     */
    public static bufferToObject(buffer: Buffer): object | string {
        if (buffer == null) {
            return null;
        }

        if (Number(parseFloat(buffer.toString())) === (buffer as any)) {
            return buffer;
        }

        const bufferString = buffer.toString('utf8');

        if (bufferString.length <= 0) {
            return null;
        }

        try {
            return JSON.parse(bufferString);
        } catch (err) {
            this.logger.error('Error parsing buffer to JSON', bufferString);
            return bufferString;
        }
    }

    public static uInt8ArrayToObject(payload: Uint8Array): object | string {
        if (payload === null) {
            return null;
        }

        if (Number(parseFloat(payload.toString())) === (payload as any)) {
            return payload;
        }

        const payloadString = payload.toString();

        if (payloadString.length <= 0) {
            return null;
        }

        try {
            return JSON.parse(payloadString);
        } catch (err) {
            this.logger.error('Error parsing Uint8Array to JSON', payloadString);
            return payloadString;
        }
    }

    /**
     * bufferToDate
     *
     * @static
     * @param {Buffer} buffer
     * @returns {(Date | undefined)}
     * @memberof Transform
     */
    public static bufferToDate(buffer: Buffer): Date | undefined {
        if (buffer == null) {

            return;
        }

        const bufferString = buffer.toString();
        if (bufferString.length <= 0) {

            return;
        }

        if (/\d+/g.test(bufferString)) {

            return new Date(parseInt(bufferString, 10));
        }

        return;
    }

    public static bufferToString(buffer: Buffer): string | undefined {
        if (buffer == null) {
            return null;
        }

        return buffer.toString();
    }

    /**
     * Transform iterator to array of objects
     *
     * @param {'fabric-shim'.Iterators.Iterator} iterator
     * @returns {Promise<Array>}
     */
    public static async iteratorToList(iterator: Iterators.CommonIterator<any>) {
        const allResults = [];

        let res: Iterators.NextResult<any>;
        while (res == null || !res.done) {
            res = await iterator.next();

            if (res.value && res.value.value.toString()) {
                let parsedItem: any;

                try {
                    parsedItem = JSON.parse(res.value.value.toString('utf8'));
                } catch (err) {
                    parsedItem = res.value.value.toString('utf8');
                }
                allResults.push(parsedItem);
            }
        }

        await iterator.close();

        return allResults;
    }

    /**
     * Transform iterator to array of objects
     *
     * @param {'fabric-shim'.Iterators.Iterator} iterator
     * @returns {Promise<Array>}
     */
    public static async iteratorToKVList(iterator: Iterators.CommonIterator<any>): Promise<KV[]> {
        const allResults = [];

        let res: Iterators.NextResult<any>;
        while (res == null || !res.done) {
            res = await iterator.next();
            if (res.value && res.value.value.toString()) {
                let parsedItem: KV = {key: '', value: {}};

                parsedItem.key = res.value.key;

                try {
                    parsedItem.value = JSON.parse(res.value.value.toString('utf8'));
                } catch (err) {
                    parsedItem.value = res.value.value.toString('utf8');
                }
                allResults.push(parsedItem);
            }
        }

        await iterator.close();

        return allResults;
    }

    /**
     * Transform iterator to array of objects
     *
     * @param {'fabric-shim'.Iterators.HistoryQueryIterator} iterator
     * @returns {Promise<Array>}
     */
    public static async iteratorToHistoryList(iterator: Iterators.HistoryQueryIterator): Promise<KeyModificationItem[]> {
        const allResults = [];

        let res: Iterators.NextKeyModificationResult;
        while (res == null || !res.done) {
            res = await iterator.next();
            if (res.value && res.value.value.toString()) {
                let parsedItem: KeyModificationItem = {
                    is_delete: false,
                    value: {},
                    timestamp: null,
                    tx_id: ''
                };

                try {
                    parsedItem.value = JSON.parse(res.value.value.toString());
                } catch (err) {
                    parsedItem.value = res.value.value.toString();
                }

                parsedItem.is_delete = res.value.isDelete;
                parsedItem.tx_id = res.value.txId;
                parsedItem.timestamp = res.value.timestamp.seconds;

                allResults.push(parsedItem);
            }
        }

        await iterator.close();

        return allResults;
    }

    /**
     * normalizePayload
     *
     * @static
     * @param {*} value
     * @returns {*}
     * @memberof Transform
     */
    public static normalizePayload(value: any): any {

        if (_.isDate(value)) {
            return value.getTime();
        } else if (_.isString(value)) {
            return value;
        } else if (_.isArray(value)) {
            return _.map(value, (v: object) => {
                return this.normalizePayload(v);
            });
        } else if (_.isObject(value)) {
            return _.mapValues(value, (v: any) => {
                return this.normalizePayload(v);
            });
        }

        return value;
    }
}
