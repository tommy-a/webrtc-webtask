declare module 'store' {
    namespace store {
        function set<T>(key: string, value: T): T;
        function get<T>(key: string, defaultValue?: T): T;
    }

    export = store;
}
