export type PublicKey = string;

export interface Packet {
    src: PublicKey;
    dst: PublicKey;
    session: number;
    payload: {};
}

export function validatePacket(packet: {[key in keyof Packet]: any}): null | string {
    if (typeof packet.src !== 'string') {
        return 'Must provide a valid src property';
    }

    if (typeof packet.dst !== 'string') {
        return 'Must provide a valid dst property';
    }

    if (typeof packet.session !== 'number') {
        return 'Must provide a valid session property';
    }

    if (typeof packet.payload !== 'object') {
        return 'Must provide a valid payload property';
    }

    return null;
}
