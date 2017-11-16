export interface Config {
    webtaskUrl: string;
    pollFrequency: number;
    rtc: {
        iceServers: IceServer[];
    };
}

interface IceServer {
    urls: string;
}
