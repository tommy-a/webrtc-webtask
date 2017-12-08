import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Button, Dimmer, Grid, Header, Loader, Segment } from 'semantic-ui-react';
import * as uuidv4 from 'uuid/v4';

import { Controller } from './controller';
import { Peer } from './peer';

interface Props {
    uuid: string;
}

interface State {
    isLocalOpen?: boolean;
    isRemoteConnecting?: boolean;
    isRemoteOpen?: boolean;
}

class Client extends React.Component<Props, State> {
    private controller: Controller;
    private peer: Peer;

    refs: {
        idInput: HTMLInputElement;
        localVideo: HTMLVideoElement;
        remoteVideo: HTMLVideoElement;
    };

    constructor(props: Props) {
        super(props);

        this.state = {
            isLocalOpen: false,
            isRemoteConnecting: false,
            isRemoteOpen: false
        };
    }

    async componentDidMount() {
        // init the local camera stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        this.refs.localVideo.srcObject = stream;

        this.setState({
            isLocalOpen: true
        });

        this.controller = new Controller(this.props.uuid);
        this.peer = new Peer(stream);

        // listen to state changes
        this.peer.isRemoteConnecting.subscribe(isRemoteConnecting => this.setState({ isRemoteConnecting }));
        this.peer.isRemoteOpen.subscribe(isRemoteOpen => this.setState({ isRemoteOpen }));

        // tie the webrtc peer to the http controller for sending and receiving packets
        this.controller.publisher.subscribe(this.peer.subscriber);
        this.peer.publisher.subscribe(this.controller.subscriber);

        // start polling for packets
        this.controller.start();
    }

    onConnectClick() {
        const src = this.props.uuid;
        const dst = this.refs.idInput.value;

        this.peer.connect(src, dst);
    }

    render() {
        const { isLocalOpen, isRemoteOpen, isRemoteConnecting } = this.state;

        const gridStyle = { paddingTop: 50 };
        const segmentStyle = { width: '100%', height: '100%', padding: 0 };
        const videoStyle = { width: '100%', height: '100%' };

        return (
            <Grid centered relaxed padded='vertically' style={ gridStyle }>
                <Grid.Row>
                    <Grid.Column width={ 4 } textAlign={ 'center' }>
                        <Segment inverted basic style={ segmentStyle }>
                            <video autoPlay ref='localVideo' id='local-video' style={ videoStyle } />
                            <Dimmer active={ !isLocalOpen }>
                                <Loader> Loading Camera </Loader>
                            </Dimmer>
                        </Segment>
                    </Grid.Column>
                    <Grid.Column width={ 4 } textAlign={ 'center' } verticalAlign='middle'>
                        <Header size='medium' content='User Id:' subheader={ this.props.uuid } />
                        <Header size='medium' content='Connect To:' />
                        <div className='ui mini fluid action input'>
                            <input ref='idInput' type='text' placeholder='id...' />
                            <Button icon='world' onClick={ () => this.onConnectClick() } />
                        </div>
                    </Grid.Column>
                    <Grid.Column width={ 4 } textAlign={ 'center' }>
                        <Segment inverted basic style={ segmentStyle }>
                            <video autoPlay ref='remoteVideo' id='remote-video' style={ videoStyle } />
                            <Dimmer active={ !isRemoteOpen }>
                                <Loader>{ isRemoteConnecting ? 'Connecting...' : 'Waiting for request' }</Loader>
                            </Dimmer>
                        </Segment>
                    </Grid.Column>
                </Grid.Row>
            </Grid>
        );
    }
}

ReactDOM.render(
    <Client uuid={ uuidv4() } />,
    document.getElementById('root')
);
