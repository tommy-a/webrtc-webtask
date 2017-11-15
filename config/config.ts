export interface Config {
    webtaskUrl: string;
    rtc: {
        iceServers: IceServer[];
    };
}

interface IceServer {
    urls: string;
}
