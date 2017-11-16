import * as config from 'config';
import * as rp from 'request-promise-native';
import 'rxjs/add/observable/timer';
import 'rxjs/add/operator/map';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { Subscriber } from 'rxjs/Subscriber';
import { Subscription } from 'rxjs/Subscription';

import { Packet } from './packet';

export class Poller {
    private _publisher = new Subject<Packet>();
    private _subscriber = new Subscriber<Packet>({
        next: async (packet) => await this.sendPacket(packet)
    });

    get publisher() { return this._publisher.asObservable(); }
    get subscriber() { return this._subscriber; }

    private subscription = new Subscription(); // for polling the webtask

    constructor(readonly key: string) {
        this.subscription.add(
            Observable
                .timer(0, 500)
                .map(() => this.poll())
                .subscribe(async (packets) => (await packets).forEach(p => this._publisher.next(p)))
        );
    }

    private sendPacket(packet: Packet): Promise<void> {
        return rp({
            method: 'POST',
            uri: config.webtaskUrl,
            body: packet,
            json: true
        });
    }

    private poll(): Promise<Packet[]> {
        return rp({
            method: 'GET',
            uri: `${config.webtaskUrl}/${this.key}`,
            json: true
        });
    }
}
