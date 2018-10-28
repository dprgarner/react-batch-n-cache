const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

// No output; this webpack config is for the webpack dev server only.
module.exports = {
  entry: {
    demo: './demo',
  },

  devtool: 'inline-source-map',

  devServer: {
    contentBase: path.join(__dirname, 'demo'),
    noInfo: true,
    hot: true,
    port: 3000,
  },

  mode: 'development',

  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },

      {
        test: /\.css$/,
        use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      title: "React Batch 'n Cache Demo",
    }),
    new webpack.HotModuleReplacementPlugin(),
  ],
};
