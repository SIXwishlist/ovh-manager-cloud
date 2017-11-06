import FriendlyErrorsPlugin from 'friendly-errors-webpack-plugin'
import webpack from 'webpack'

import loaders from './loaders'
import baseConfig from './webpack.base.babel'

let devConfig = Object.assign({}, baseConfig, {
  devtool: '#inline-source-map',
  module: {
    rules: loaders.rules('development')
  }
})

devConfig.entry.app.push('./build/dev-client')
devConfig.plugins.push(new webpack.HotModuleReplacementPlugin())
devConfig.plugins.push(new webpack.NoEmitOnErrorsPlugin())
devConfig.plugins.push(new FriendlyErrorsPlugin())

export default devConfig