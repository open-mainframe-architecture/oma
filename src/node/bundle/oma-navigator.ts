import { BundleConfiguration } from 'oma/web'

const configuration: BundleConfiguration = {
  modules: ['oma/navigator', 'oma/http', 'oma/data/**/*.js'],
  globals: {
    React: {
      package: 'react',
      path: '//unpkg.com/react@15/dist/react.js'
    },
    ReactDOM: {
      package: 'react-dom',
      path: '//unpkg.com/react-dom@15/dist/react-dom.js',
      depends: ['react']
    }
  }
}

export default configuration