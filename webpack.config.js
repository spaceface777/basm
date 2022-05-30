const { merge } = require('webpack-merge')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const files_to_copy = { patterns: [
    { from: './public/**/*', to: '.' },
    { from: './src/wasm/main.wasm', to: 'public/main.wasm' },
]}

const common = {
    entry: './src/js/index.js',
    output: {
        publicPath: "/",
        path: __dirname + '/dist',
        filename: 'bundle.js',
        clean: true
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
            minify: 'auto'
        }),
        new CopyWebpackPlugin(files_to_copy),
      ],
    module: {
        rules: [
            {
                test: /\.css$/,
                exclude: /node_modules/,
                use: ['style-loader', 'css-loader']
            },
        ]
    },
    resolve: {
        extensions: ['.js'],
    },
    stats: {
        errors: true,
        errorDetails: true,
        warnings: true,

        hash: false,
        version: false,
        timings: false,
        assets: false,
        chunks: false,
        modules: false,
        reasons: false,
        children: false,
        source: false,
        publicPath: false,
    },
    experiments: {
        topLevelAwait: true
    },
}

const dev = {
    mode: 'development',
    devtool: 'eval-source-map',
    devServer: {
        historyApiFallback: true,
        devMiddleware: {
            index: true,
            mimeTypes: { phtml: 'text/html' },
            publicPath: '/',
            writeToDisk: true,
        },
        hot: true,
    },
}

const prod = {
    mode: 'production',
}

module.exports = (env, argv) => {
    if (argv.mode === 'development') {
        files_to_copy.patterns.push({ from: './src/wasm/main.wasm.map', to: 'public/main.wasm.map' })    
    }

    return merge(common, argv.mode === 'development' ? dev : prod)
}
