import * as config from 'config';
import { Subject } from 'rxjs/Subject';
import { Subscriber } from 'rxjs/Subscriber';
import * as store from 'store';
import 'webrtc-adapter';

import { Packet } from './packet';

type RTCPayload = {[key in keyof (RTCIceCandidate & RTCSessionDescription)]: any};

export class Peer {
    private isActive = false;

    // the peer connection for the current session
    private pc = new RTCPeerConnection(config.rtc);
    private src: string; // self-id
    private dst: string; // id of the peer to connect to

    // pub/sub for receiving and emitting packets
    private _publisher = new Subject<Packet>();
    private _subscriber = new Subscriber<Packet>({
        next: async (packet) => await this.onPacket(packet)
    });

    get publisher() { return this._publisher.asObservable(); }
    get subscriber() { return this._subscriber; }

    // emitters for UI state updates
    private _isRemoteConnecting = new Subject<boolean>();
    private _isRemoteOpen = new Subject<boolean>();

    get isRemoteConnecting() { return this._isRemoteConnecting.asObservable(); }
    get isRemoteOpen() { return this._isRemoteOpen.asObservable(); }

    // getters for the current state of the peer connection
    get hasOffer() { return this.hasLocalOffer || this.hasRemoteOffer; }
    get hasLocalOffer() { return this.pc.signalingState === 'have-local-offer'; }
    get hasRemoteOffer() { return this.pc.signalingState === 'have-remote-offer'; }

    constructor(readonly localStream: MediaStream) {}

    // incrementally updated sequence number used for ignoring stale payloads
    private currentSession(dst: string): number {
        return store.get(dst, 0);
    }

    private updateSession(dst: string, session: number): number {
        return store.set(dst, session);
    }

    async connect(src: string, dst: string): Promise<void> {
        // start a new session
        const session = this.currentSession(dst) + 1;
        this.init(src, dst, session);

        this.pc.onnegotiationneeded = async (evt) => {
            await this.publishOffer();
        };

        // add the stream to the peer connection
        await this.addTracks();
    }

    close(): void {
        if (!this.isActive) {
            return;
        }

        this.pc.close();

        this.isActive = false;
        this._isRemoteConnecting.next(false);
        this._isRemoteOpen.next(false);
    }

    private init(src: string, dst: string, session: number): void {
        this.close();

        this.isActive = true;
        this._isRemoteConnecting.next(true);

        this.pc = new RTCPeerConnection(config.rtc);
        this.src = src;
        this.dst = dst;

        this.updateSession(dst, session);

        this.pc.onicecandidate = (evt) => {
            if (evt.candidate) {
                this.publishCandidate(evt.candidate);
            }
        };

        this.pc.ontrack = (evt) => {
            const player = document.getElementById('remote-video')! as HTMLMediaElement;
            player.srcObject = evt.streams[0];

            this._isRemoteConnecting.next(false);
            this._isRemoteOpen.next(true);
        };
    }

    private async addTracks(): Promise<void> {
        // triggers negotiation if an offer hasn't been created/received yet
        const tracks = this.localStream.getTracks();
        tracks.forEach(track => this.pc.addTrack(track, this.localStream));
    }

    private async onPacket(packet: Packet): Promise<void> {
        const session = this.currentSession(packet.src);

        // ignore stale packets
        if (packet.session < session) {
            return;
        }

        // ignore packets that aren't from the active session's peer
        if (this.isActive && packet.src !== this.dst) {
            this.updateSession(packet.src, session + 1); // ignore this session request for now, but anticipate a future request
            return;
        }

        // close an old session
        if (packet.session > session) {
            this.close();
        }

        const payload = packet.payload as RTCPayload;
        const isOffer = payload.type === 'offer';

        // check for RTCSessionDescription
        if (payload.sdp) {
            return isOffer ? this.handleOffer(packet) : this.handleAnswer(payload);
        } else {
            // otherwise it's an RTCIceCandidate
            return this.handleCandidate(payload);
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
    }

    private async publishAnswer(): Promise<void> {
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);

        this.publishPacket(this.pc.localDescription!);
    }

    private publishCandidate(candidate: RTCIceCandidate): void {
        this.publishPacket(candidate);
    }

    private publishPacket(payload: {}): void {
        this._publisher.next({
            src: this.src,
            dst: this.dst,
            session: this.currentSession(this.dst),
            payload
        });
    }
}
