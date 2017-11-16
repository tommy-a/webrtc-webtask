import * as config from 'config';
import { Subject } from 'rxjs/Subject';
import { Subscriber } from 'rxjs/Subscriber';
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

    private _publisher = new Subject<Packet>();
    private _subscriber = new Subscriber<Packet>({
        next: async (packet) => await this.onPacket(packet)
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

        this.pc.ontrack = (evt) => {
            const player = document.getElementById('received_video')! as HTMLMediaElement;
            player.srcObject = evt.streams[0];
        };

        await this.addTracks();
    }

    close(): void {
        if (!this.isConnecting) {
            return;
        }

        this.isConnecting = false;
        this.pc.close();
    }

    private init(src: string, dst: string, session: number): void {
        this.close();
        this.isConnecting = true;

        this.pc = new RTCPeerConnection(config.rtc);
        this.src = src;
        this.dst = dst;

        store.set(dst, session); // update the session

        this.pc.onicecandidate = (evt) => {
            if (evt.candidate) {
                this.publishCandidate(evt.candidate);
            }
        };
    }

    private async addTracks(): Promise<void> {
        const stream = await navigator.mediaDevices.getUserMedia(Peer.CONSTRAINTS);
        const tracks = stream.getTracks();

        // triggers negotiation if an offer hasn't been created/received yet
        tracks.forEach(track => this.pc.addTrack(track, stream));
    }

    private async onPacket(packet: Packet): Promise<void> {
        const session = this.currentSession(packet.src);

        // ignore packets that aren't from the active dst
        if (this.isConnecting && packet.src !== this.dst) {
            return;
        }
        // ignore stale packets
        if (packet.session < session) {
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
