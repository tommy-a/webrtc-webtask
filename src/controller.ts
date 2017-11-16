import * as config from 'config';
import * as rp from 'request-promise-native';
import 'rxjs/add/observable/fromPromise';
import 'rxjs/add/observable/timer';
import 'rxjs/add/operator/concatAll';
import 'rxjs/add/operator/concatMap';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { Subscriber } from 'rxjs/Subscriber';
import { Subscription } from 'rxjs/Subscription';

import { Packet } from './packet';

export class Controller {
    private _publisher = new Subject<Packet>();
    private _subscriber = new Subscriber<Packet>({
        next: async (packet) => await this.sendPacket(packet)
    });

    get publisher() { return this._publisher.asObservable(); }
    get subscriber() { return this._subscriber; }

    private subscription: Subscription; // for polling the webtask

    constructor(readonly key: string) {}

    start(): void {
        if (this.subscription) { return; }
        this.subscription = this.poll().subscribe(p => this._publisher.next(p));
    }

    stop(): void {
        if (!this.subscription) { return; }
        this.subscription.unsubscribe();
        delete this.subscription;
    }

    private poll(): Observable<Packet> {
        return Observable
            .timer(0, config.pollFrequency)
            .concatMap(
                () => Observable.fromPromise(this.getPackets()).concatAll()
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

    private getPackets(): Promise<Packet[]> {
        return rp({
            method: 'GET',
            uri: `${config.webtaskUrl}/${this.key}`,
            json: true
        });
    }
}
