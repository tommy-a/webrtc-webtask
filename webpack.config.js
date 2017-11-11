const webpack = require('webpack');

module.exports = {
    entry: {
        webtask: './src/webtask.ts'
    },

    output: {
        path: `${__dirname}/dist/`,
        publicPath: '/dist/',
        filename: './[name].js',
        libraryTarget: 'commonjs2'
    },

    resolve: {
        extensions: ['.ts']
    },

    externals: {
        "body-parser": "body-parser",
        "express": "express",
        "webtask-tools": "webtask-tools"
    },

    module: {
        rules: [
            {
                test: /\.ts?$/,
                loader: 'awesome-typescript-loader',
                include: `${__dirname}/src`,
                query: {
                    tsconfig: './tsconfig.json'
                }
            }
        ]
    }
};
