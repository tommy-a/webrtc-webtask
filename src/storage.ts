import { Packet, PublicKey } from './packet';

interface State {
    packets: Map<PublicKey, Packet[]>;
}

export class Storage {
    private storage: any;

    private state: State;
    private isDirty = false;

    deserialize(context: any): Promise<void> {
        this.storage = context.storage;

        return new Promise((resolve, reject) => {
            // obtain storage
            this.storage.get((err: any, data: {[key in keyof State]: any}) => {
                if (err) { return reject(err); }

                // deserialize state maps
                this.state = {
                    packets: new Map(data ? JSON.parse(data.packets) : null)
                };

                resolve();
            });
        });
    }

    serialize(): Promise<void> {
        if (!this.isDirty) { return Promise.resolve(); }

        return new Promise((resolve, reject) => {
            // serialize state maps
            const data = {
                packets: JSON.stringify(Array.from(this.state.packets.entries()))
            };

            // overwrite storage
            this.storage.set(data, ((err: any) => this.attemptSet(err, data, 3, resolve, reject)));
        });
    }

    private attemptSet(err: any, data: any, attempt: number, resolve: any, reject: any): void {
        if (!err) { return resolve(); }

        if (err.code === 409 && attempt--) {
            return this.storage.set(data, this.attemptSet(err, data, attempt, resolve, reject));
        }

        reject(err);
    }

    queuePacket(packet: Packet): void {
        // retrieve the queue
        const packets = this.state.packets;
        const queue = packets.get(packet.dst) || [];

        // add and store the new packet to the queue
        queue.push(packet);
        packets.set(packet.dst, queue);

        this.isDirty = true;
    }

    dequeuePackets(key: PublicKey): Packet[] {
        // retrieve the queue
        const packets = this.state.packets;
        const queue = packets.get(key) || [];

        // clear and return any existing queue
        if (queue.length >= 1) {
            packets.delete(key);
            this.isDirty = true;
        }

        return queue;
    }
}
