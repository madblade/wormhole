const path = require('path');
const webpack = require('webpack');

module.exports = {
    mode: 'development',
    entry: './src/main.js',

    output: {
        path: path.resolve(__dirname, './dist'),
        publicPath: '/dist/',
        filename: 'build.js'
    },

    module: {
        rules: [
            // {
            //     test: /\.js$/,
            //     loader: 'eslint-loader',
            //     enforce: 'pre'
            // },
            {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
            // ,
            // {
            //     test: /\.glsl$/,
            //     use: 'raw-loader'
            // }
        ]
    },

    // devtool: '#source-map',

    optimization: {
        minimize: true
    }
};
