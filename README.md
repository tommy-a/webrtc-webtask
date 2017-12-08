# webrtc-webtask
> A simple React.js video chat app to demonstrate using a webtask-based WebRTC signaling server

## Overview
To make use of the app:
1) Make sure your webcam is active (i.e. your laptop isn't closed)
2) Open two separate windows -- **not two tabs** (Chrome seems to work the best)
3) Navigate to https://tommy-a.github.io/webtask/ in both windows
4) Copy and paste the user id from one window to the other, into the text input field
5) Click the globe icon to start connecting
6) If it doesn't connect within a few seconds... try disconnecting, or refreshing and starting over

Essentially what's going on behind the scenes is that the `src/webtask.ts` + `src/storage.ts` classes (i.e. the webtask source logic) are routing and caching WebRTC requests to establish a P2P connection between two clients.  `controller.ts` then polls the webtask on behalf of the client at a fixed interval to see if the client has any outstanding requests, as well as sends any requests or responses of its own.  All packets received by the controller get passed off to `peer.ts`, which is then responsible for handling all of the necessary WebRTC logic.  Any response or request packets generated are forwarded to the controller, to be POSTed to the webtask.

`client.tsx` simply serves as the React frontend for generating a unique user id + setting up the video DOM elements, as well as for allowing the user to both connect and disconnect to other clients.  When a request to connect comes in for the user, the app will automatically accept it and start to connect.  However if the user is currently in the middle of a session, the request will be silently dropped/ignored.