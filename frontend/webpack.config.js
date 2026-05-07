const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

/** @type {import('webpack').Configuration} */
module.exports = (env, argv) => {
  const isProd = argv.mode === "production";
  const devPort = Number(process.env.PORT) || 5173;

  return {
    entry: path.join(__dirname, "src", "main.tsx"),
    output: {
      path: path.join(__dirname, "dist"),
      filename: isProd ? "[name].[contenthash].js" : "[name].js",
      publicPath: "/",
      clean: true,
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js"],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: "ts-loader",
            options: { transpileOnly: true },
          },
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.join(__dirname, "public", "index.html"),
      }),
    ],
    devServer: {
      port: devPort,
      hot: true,
      historyApiFallback: true,
      proxy: [
        {
          context: ["/api"],
          target: "http://localhost:5280",
          changeOrigin: true,
          // Avoid premature 504 when the .NET API is slow to answer (e.g. first SQL connection).
          timeout: 120_000,
          proxyTimeout: 120_000,
        },
      ],
    },
    devtool: isProd ? "source-map" : "eval-cheap-module-source-map",
  };
};
