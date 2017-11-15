import { Peer } from './peer';

const peerA = new Peer();
const peerB = new Peer();

peerA.publisher.subscribe({
    next: (packet) => {
        console.log('A:');
        console.log(packet);
        peerB.subscriber.next(packet);
    }
});

peerB.publisher.subscribe({
    next: (packet) => {
        console.log('B:');
        console.log(packet);
        peerA.subscriber.next(packet);
    }
});

(async () => {
    await peerA.connect('src', 'dst');
})();
