const config = require('config');
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');

fs.writeFileSync(path.resolve(__dirname, 'dist/config.json'), JSON.stringify(config));

module.exports = {
    entry: {
        test: './src/test.ts',
        webtask: './src/webtask.ts'
    },

    output: {
        path: `${__dirname}/dist/`,
        publicPath: '/dist/',
        filename: './[name].js',
        libraryTarget: 'commonjs2'
    },

    resolve: {
        extensions: ['.js', '.ts'],
        alias: {
            config: path.resolve(__dirname, 'dist/config.json')
        }
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
    },

    devtool: 'eval-source-map'
};
