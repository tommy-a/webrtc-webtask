import * as config from 'config';
import { Subject } from 'rxjs/Subject';
import { Subscriber } from 'rxjs/Subscriber';
import { Subscription } from 'rxjs/Subscription';
import * as store from 'store';
import 'webrtc-adapter';

import { Packet } from './packet';

type RTCPayload = {[key in keyof (RTCIceCandidate & RTCSessionDescription)]: any};

export class Peer {
    static CONSTRAINTS = { audio: true, video: true };

    private isConnecting = false;

    private pc = new RTCPeerConnection(config.rtc);
    private src: string; // self-id
    private dst: string; // id of the peer to connect to

    private candidates: Subject<RTCIceCandidate>; // pool for keeping track of candidates to be published
    private subscription: Subscription; // ties candidates to the publishCandidate() method; must be destroyed on close()

    private trackCount: number;
    private offersSent: number;

    private _publisher = new Subject<Packet>();
    private _subscriber = new Subscriber<Packet>({
        next: async (packet) => await this.onPacket(packet) // TODO: do we need to catch + throw errors here?
    });

    get publisher() { return this._publisher.asObservable(); }
    get subscriber() { return this._subscriber; }

    get hasOffer() { return this.hasLocalOffer || this.hasRemoteOffer; }
    get hasLocalOffer() { return this.pc.signalingState === 'have-local-offer'; }
    get hasRemoteOffer() { return this.pc.signalingState === 'have-remote-offer'; }

    // incrementally updated sequence number used for ignoring stale payloads
    private currentSession(dst: string): number {
        return store.get(dst, 0);
    }

    async connect(src: string, dst: string): Promise<void> {
        // start a new session
        const session = this.currentSession(dst) + 1;

        this.init(src, dst, session);

        this.pc.onnegotiationneeded = async (evt) => {
            await this.publishOffer();
        };

        await this.addTracks();
    }

    close(): void {
        if (!this.isConnecting) {
            return;
        }

        this.isConnecting = false;
        this.pc.close();
        this.subscription.unsubscribe();
    }

    private init(src: string, dst: string, session: number): void {
        this.close();
        this.isConnecting = true;

        this.pc = new RTCPeerConnection(config.rtc);
        this.src = src;
        this.dst = dst;

        store.set(dst, session); // update the session

        this.candidates = new Subject<RTCIceCandidate>();
        this.subscription = new Subscription();

        this.trackCount = 0;
        this.offersSent = 0;

        this.pc.onicecandidate = (evt) => {
            if (evt.candidate) {
                this.candidates.next(evt.candidate);
            } else {
                this.candidates.complete();
            }
        };
    }

    private async addTracks(): Promise<void> {
        const stream = await navigator.mediaDevices.getUserMedia(Peer.CONSTRAINTS);

        const tracks = stream.getTracks();
        this.trackCount = tracks.length;

        // triggers negotiation if an offer hasn't been created/received yet
        tracks.forEach(track => this.pc.addTrack(track, stream));
    }

    private async onPacket(packet: Packet): Promise<void> {
        const session = this.currentSession(packet.src);

        // ignore packets that aren't from the active dst
        if (this.isConnecting && packet.src !== this.dst) {
            return;
        }
        // ignore stale payloads
        if (packet.session < session) {
            return;
        }

        const payload = packet.payload as RTCPayload;
        const isOffer = payload.type === 'offer';

        // close an old session, and react to a newer offer
        if (packet.session > session) {
            this.close();
            return isOffer ? this.handleOffer(packet) : Promise.resolve();
        }

        // check for RTCSessionDescription
        if (payload.sdp) {
            if (isOffer) {
                return this.handleOffer(packet);
            } else {
                return this.hasOffer ? this.handleAnswer(payload) : this.close();
            }
        } else {
            // otherwise it's an RTCIceCandidate
            return this.hasOffer ? this.handleCandidate(payload) : this.close();
        }
    }

    private async handleOffer(packet: Packet): Promise<void> {
        // resolve a tiebreaker if both peer's have sent an offer with the same session id
        if (this.hasLocalOffer && this.src < packet.src) {
            return; // (i.e. the other peer should publish an answer instead)
        }

        // is this the first offer, or a tiebreaker replacement
        const isInitialOffer = !this.hasOffer || this.hasLocalOffer;
        if (isInitialOffer) {
            // swap src with dst -> the offer is coming from the peer
            this.init(packet.dst, packet.src, packet.session);
        }

        await this.pc.setRemoteDescription(packet.payload as RTCPayload);

        if (isInitialOffer) {
            this.publishCandidates();
            await this.addTracks();
            await this.publishAnswer();
        }
    }

    private async handleAnswer(answer: RTCSessionDescription): Promise<void> {
        await this.pc.setRemoteDescription(answer);
    }

    private async handleCandidate(candidate: RTCIceCandidate): Promise<void> {
        await this.pc.addIceCandidate(candidate);
    }

    private async publishOffer(): Promise<void> {
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);

        this.publishPacket(this.pc.localDescription!);

        this.offersSent++;
        this.publishCandidates();
    }

    private async publishAnswer(): Promise<void> {
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);

        this.publishPacket(this.pc.localDescription!);
    }

    // this is only to be called after publishing or handling an initial offer
    private publishCandidates(): void {
        if (this.offersSent !== this.trackCount) {
            return;
        }

        this.subscription.add(this.candidates.subscribe(async (c) => await this.publishPacket(c)));
    }

    private async publishPacket(payload: {}): Promise<void> {
        this._publisher.next({
            src: this.src,
            dst: this.dst,
            session: this.currentSession(this.dst),
            payload
        });
    }
}
