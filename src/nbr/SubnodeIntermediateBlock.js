import { InternalBlock } from "./InternalBlock.js";
import { SubnodeIntermediateEntry } from "./SubnodeIntermediateEntry.js";

export class SubnodeIntermediateBlock extends InternalBlock {
    #dv;

    /**
     * @param {DataView} dv
     * @param {number} dataSize
     */
    constructor (dv, dataSize) {
        super(dv, dataSize);

        this.#dv = dv;
    }

    /**
     * @param {number} n
     */
    getEntry (n) {
        const begin = this.#dv.byteOffset + 8 + n * 16; // Mỗi entry có kích thước 16 bytes
        const dv = new DataView(this.#dv.buffer, begin, 16);
        return new SubnodeIntermediateEntry(dv);
    }

    getAllEntries () {
        const out = [];

        for (let i = 0; i < this.cEnt; i++) {
            out.push(this.getEntry(i));
        }

        return out;
    }
}
