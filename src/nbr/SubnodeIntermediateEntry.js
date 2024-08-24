export class SubnodeIntermediateEntry {
    #dv;

    get nid () { return this.#dv.getBigUint64(0, true); }
    get bidSub () { return this.#dv.getBigUint64(8, true); }

    /**
     * @param {DataView} dv
     */
    constructor (dv) {
        this.#dv = dv;
    }
}
