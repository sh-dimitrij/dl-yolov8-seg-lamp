const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");
const webpack = require('webpack');

module.exports = {
  webpack: {
    plugins: {
      add: [
        new webpack.DefinePlugin({
          'process.env.PUBLIC_URL': JSON.stringify('/dl-yolov8-seg-lamp')
        }),
        new CopyPlugin({
          patterns: [
            { from: "node_modules/onnxruntime-web/dist/*.wasm", to: "static/js/[name][ext]" },
            { from: './public/model/model.onnx',           to: 'model/[name][ext]' },
            { from: './public/model/nms-yolov8.onnx',      to: 'model/[name][ext]' },
            { from: './public/model/mask-yolov8-seg.onnx', to: 'model/[name][ext]' },
            { from: './public/search_images', to: 'search_images' },
          ],
        }),
      ],
    },
    configure: (config) => {
      config.resolve.fallback = { fs: false, path: false, crypto: false };
      return config;
    },
  },
  devServer: {
    historyApiFallback: {
      disableDotRule: true,
      rewrites: [
        { from: /\.(onnx|wasm)$/, to: (context) => context.parsedUrl.pathname },
      ],
    },
    setupMiddlewares: (middlewares, devServer) => {
      const express = require("express");

      // Глобальные заголовки для всех ответов
      devServer.app.use((req, res, next) => {
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        // ВАЖНО: разрешаем загрузку изображений
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        next();
      });

      // Статические файлы с правильными заголовками
      devServer.app.use(
        '/search_images',
        express.static(path.resolve(__dirname, 'public/search_images'), {
          setHeaders: (res) => {
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
            res.setHeader('Access-Control-Allow-Origin', '*');
          },
        })
      );

      devServer.app.use(
        '/model',
        express.static(path.resolve(__dirname, 'public/model'), {
          setHeaders: (res) => {
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
          },
        })
      );

      return middlewares;
    },
  },
};