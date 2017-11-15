import 'config';
import { Config } from '../config/config';

declare module 'config' {
    interface IConfig extends Config {}
}
