import { BundleConfiguration } from 'oma/web'

const configuration: BundleConfiguration = {
  modules: ['oma/kernel', 'oma/isolate', 'oma/theater/*.js'],
  // by definition, foundation bundle cannot depend on globals
  globals: {}
}

export default configuration