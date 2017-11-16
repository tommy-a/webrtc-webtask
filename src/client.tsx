import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Controller } from './controller';
import { Peer } from './peer';

interface Props {}
interface State {}

class Client extends React.Component<Props, State> {
    // TODO: turn into a single controller + peer... after done testing
    private srcController = new Controller('src');
    private srcPeer = new Peer();

    private dstController = new Controller('dst');
    private dstPeer = new Peer();

    refs: {
        'local-video': HTMLVideoElement;
        'remote-video': HTMLVideoElement;
    };

    componentDidMount() {
        this.srcController.publisher.subscribe(this.srcPeer.subscriber);
        this.dstController.publisher.subscribe(this.dstPeer.subscriber);

        this.srcPeer.publisher.subscribe(this.srcController.subscriber);
        this.dstPeer.publisher.subscribe(this.dstController.subscriber);

        this.srcController.start();
        this.dstController.start();

        this.srcPeer.connect('src', 'dst');
    }

    render() {
        return (
            <div>
                <video autoPlay ref='local-video' id='local-video' />
                <video autoPlay ref='remote-video' id='remote-video' />
            </div>
        );
    }
}

ReactDOM.render(
    <Client />,
    document.getElementById('root')
);
