import 'rxjs/add/observable/timer';
import 'rxjs/add/operator/zip';
import { Observable } from 'rxjs/Observable';

import { Peer } from './peer';
import { Poller } from './poller';

const srcPeer = new Peer();
const dstPeer = new Peer();

const srcPoller = new Poller('src');
const dstPoller = new Poller('dst');

srcPeer.publisher.subscribe(srcPoller.subscriber);
dstPeer.publisher.subscribe(dstPoller.subscriber);

srcPoller.publisher.subscribe(srcPeer.subscriber);
dstPoller.publisher.subscribe(dstPeer.subscriber);

(async () => {
    await srcPeer.connect('src', 'dst');
})();
