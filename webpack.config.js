const _ = require('lodash');
const path = require('path');
const fetch = require('node-fetch');

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
    hot: true,
    port: 3000,
    before: app => {
      app.get('/dog', (req, res) => {
        try {
          let breeds = req.query.breed;
          if (!breeds) {
            breeds = [];
          } else if (!_.isArray(breeds)) {
            breeds = [breeds];
          }
          Promise.all(
            breeds.map(breed =>
              fetch(`https://dog.ceo/api/breed/${breed}/images/random`)
                .then(r => r.json())
                .then(d => [breed, d.message]),
            ),
          )
            .then(dogResponses => {
              const data = {
                dogs: _.fromPairs(dogResponses),
              };
              console.log(data);
              res.json(data);
            })
            .catch(e => {
              console.error(e);
              res.status(500).json({ error: e.message });
            });
        } catch (e) {
          res.status(500).json({ error: e.message });
        }
      });
    },
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
