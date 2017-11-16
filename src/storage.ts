import { Packet, PublicKey } from './packet';

interface State {
    packets: Map<PublicKey, Packet[]>;
}

interface Delta {
    packet?: Packet;
    key?: PublicKey;
}

export class Storage {
    private storage: any;
    private state: State;

    set context(context: any) { this.storage = context.storage; };

    async queue(packet: Packet): Promise<void> {
        await this.get();
        await this.set({ packet });
    }

    async dequeue(key: PublicKey): Promise<Packet[]> {
        await this.get();

        // check if there are any packets to dequeue
        const queue = this.state.packets.get(key);
        if (!queue) {
            return [];
        }

        return this.set({ key });
    }

    reset(): void {
        this.storage.set(null, { force: 1 }, (e: any) => {
            if (e) { throw e; }
        });
    }

    private get(): Promise<void> {
        return new Promise((resolve, reject) => {
            // obtain state from storage
            this.storage.get((err: any, data: any) => {
                if (!err) {
                    this.deserialize(data);
                    resolve();
                } else {
                    reject(err);
                }
            });
        });
    }

    private deserialize(data: {[key in keyof State]: any}): void {
        this.state = {
            packets: new Map(data ? JSON.parse(data.packets) : null)
        };
    }

    private serialize() {
        return {
            packets: JSON.stringify(Array.from(this.state.packets.entries()))
        };
    }

    private async set(delta: Delta): Promise<Packet[]> {
        let queue: Packet[] = [];

        // keep attempting to write to storage
        let err = { code: 409 } as any;
        while (err && err.code === 409) {
            // (re-)apply the outstanding delta
            queue = this.applyDelta(delta);

            // serialize state
            const data = this.serialize();

            // attempt to overwrite storage
            await new Promise((resolve, reject) => {
                this.storage.set(data, (e: any) => {
                    err = e;
                    if (err && err.code === 409) {
                        this.deserialize(err.conflict);
                    } else if (err) {
                        return reject();
                    }

                    resolve();
                });
            }).catch(() => { throw err; });
        }

        return queue;
    }

    private applyDelta(delta: Delta): Packet[] {
        const packets = this.state.packets;

        // retrieve the queue
        const key = delta.key!;
        const packet = delta.packet!;
        const queue = packets.get(key || packet.dst) || [];

        // apply the delta
        if (packet) {
            // add and store the new packet to the queue
            queue.push(packet);
            packets.set(packet.dst, queue);
        } else {
            // clear the existing queue
            packets.delete(key);
        }

        return queue;
    }
}
