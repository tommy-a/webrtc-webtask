const config = require('config');
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');

if (!fs.existsSync('./dist')){
    fs.mkdirSync('./dist');
}

fs.writeFileSync(path.resolve(__dirname, 'dist/config.json'), JSON.stringify(config));

module.exports = {
    entry: {
        client: './src/client.tsx',
        webtask: './src/webtask.ts'
    },

    output: {
        path: `${__dirname}/dist/`,
        publicPath: '/dist/',
        filename: './[name].js',
        libraryTarget: 'commonjs2'
    },

    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        alias: {
            config: path.resolve(__dirname, 'dist/config.json')
        }
    },

    externals: {
        'body-parser': 'body-parser',
        'express': 'express',
        'webtask-tools': 'webtask-tools'
    },

    node: {
        fs: 'empty',
        net: 'empty',
        tls: 'empty'
    },

    module: {
        rules: [
            {
                test: /\.tsx?$/,
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
