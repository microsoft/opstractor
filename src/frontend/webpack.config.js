// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const path = require('path');
const { exec } = require('child_process');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    entry: [
        './src/app.ts',
        './src/app.css'
    ],
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].[chunkhash].js',
        publicPath: ''
    },
    resolve: {
        extensions: ['.js', '.ts', '.css']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader'
            },
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader']
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: './src/index.html'
        }),
        new MiniCssExtractPlugin({
            filename: '[name].[chunkhash].css'
        }),
        {
            apply: (compiler) => {
                compiler.hooks.afterEmit.tap('afterEmit', () => {
                    const shellexec = './package-profiles.sh';
                    console.log(`> ${shellexec}`);
                    exec(shellexec);
                });
            }
        }
    ]
};