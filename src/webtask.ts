export default (context: any, cb: any) => {
    cb(null, { hello: context.query.name || 'Anonymous' });
};
