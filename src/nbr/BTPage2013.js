import { BTEntry } from "./BTEntry.js";
import { BlockEntry } from "./BlockEntry.js";
import { NodeEntry } from "./NodeEntry.js";
import { Page2013 } from "./Page2013.js";

export class BTPage2013 extends Page2013 {
    #dv;

    /**
     * @param {DataView} dv Must be a DataView pointing to a buffer containing
     * the entire file for `getPage()`, `findEntry()`, and `getAllKeys()`
     * methods to work.
     */
    constructor(dv) {
        super(dv);

        this.#dv = dv;

        if (this.ptype !== 0x80 && this.ptype !== 0x81) {
            throw Error("Page is not a BTreePage");
        }
    }

    get cEnt() { return this.#dv.getUint16(4056, true); }
    get cEntMax() { return this.#dv.getUint16(4058, true); }
    get cbEnt() { return this.#dv.getUint8(4060); }
    get cLevel() { return this.#dv.getUint8(4061); }
    get dwPadding() { return this.#dv.getUint32(4062, true); }

    /**
     * @param {number|bigint} ib Absolute byte offset relative to start of file
     */
    getPage(ib) {
        const byteOffset = typeof ib === "number" ? ib : parseInt(ib.toString());
        return new BTPage2013(this.getDataView(byteOffset - this.#dv.byteOffset, 4096));
    }

    /**
     * @param {number} n
     */
    getEntry(n) {
        const begin = n * this.cbEnt;

        if (this.cLevel === 0) {
            if (this.ptype === 0x80) {
                return new BlockEntry(this.getDataView(begin, this.cbEnt));
            }
            if (this.ptype === 0x81) {
                return new NodeEntry(this.getDataView(begin, this.cbEnt));
            }
            throw Error("Invalid BT Page");
        }

        return new BTEntry(this.getDataView(begin, this.cbEnt));
    }

    get keys() {
        const out = [];
        for (let i = 0; i < this.cEnt; i++) {
            const entry = this.getEntry(i);

            if (entry instanceof BlockEntry) {
                out.push(entry.BREF.bid);
            }
            else if (entry instanceof NodeEntry) {
                out.push(entry.nid);
            }
            else {
                out.push(entry.btkey);
            }
        }
        return out;
    }

    /**
     * @param {number | bigint} key
     * @return {(BlockEntry|NodeEntry)?}
     */
    findEntry(key) {
        const keys = this.keys;

        // If we're level 0 then either *we* have the key or it doesn't exist.
        if (this.cLevel === 0) {
            const k = typeof key === "bigint" ? key : BigInt(key);
            const index = keys.indexOf(k);

            if (index >= 0) {
                return /** @type {BlockEntry|NodeEntry} */ (this.getEntry(index));
            }

            // Not in leaf
            return null;
        }

        // If we're above level 0 then find which of our child pages should
        // be the next step.
        for (let i = 0; i < this.cEnt; i++) {
            if (keys[i] > key) {
                // Before the first entry
                if (i === 0)
                    return null;

                const entry = this.getEntry(i - 1);
                if (!(entry instanceof BTEntry)) {
                    throw Error("Expected BT Entry");
                }

                const page = this.getPage(entry.BREF.ib);
                if (!(page instanceof BTPage2013)) {
                    throw Error("Expected BT Page");
                }

                return page.findEntry(key);
            }
        }

        // It must be in the our page (or doesn't exist).
        const entry = this.getEntry(this.cEnt - 1);
        if (!(entry instanceof BTEntry)) {
            throw Error("Expected BT Entry");
        }

        const page = this.getPage(entry.BREF.ib);
        if (!(page instanceof BTPage2013)) {
            throw Error("Expected BT Page2013");
        }

        return page.findEntry(key);
    }

    /**
     *
     * @returns {bigint[]}
     */
    getAllKeys() {
        if (this.cLevel === 0) {
            return this.keys;
        }

        const out = [];

        for (let i = 0; i < this.cEnt; i++) {
            const entry = this.getEntry(i);

            if (!(entry instanceof BTEntry)) {
                throw Error("Expected BTEntry. Got: " + (
                    entry instanceof NodeEntry ? "Node" : (
                        entry instanceof BTEntry ? ("BTEntry. bid: " + entry.BREF.bid) : "Other"
                    )
                ));
            }

            const page = this.getPage(entry.BREF.ib);
            if (!(page instanceof BTPage2013)) {
                throw Error("Expected BT Page 2013");
            }

            out.push(...page.getAllKeys());
        }

        return out;
    }

    /**
     *
     * @param {BTPage2013} oldPage
     * @param {BTPage2013} newPage
     * @param {object} entry
     * @param {bigint} entry.ib
     * @param {bigint} entry.bid
     * @param {number} entry.cb
     * @param {number} entry.cRef
     */
    static insertEntry(oldPage, newPage, { ib, bid, cb, cRef }) {
        if (oldPage.cLevel > 0) {
            throw new Error("Method not implemented.");
        }

        throw new Error("Method not implemented.");


        // if (oldPage.cEnt + 1 > oldPage.cEntMax) {
        //     throw
        // }

        // newPage.cEntMax = oldPage.cEntMax;
        // newPage.cEnt = oldPage.cEnt + 1;
        // newPage.cLevel = oldPage.cLevel;
        // newPage.cbEnt = oldPage.cEnt;
        // newPage.dwCRC = calcuateCRC(newPage.getDataView(?, ?))

        // for (let i = 0; i < oldPage.cEnt; i++) {

        // }

    }
}
