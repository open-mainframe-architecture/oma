import { ServiceConfiguration } from 'oma/web'

import * as os from 'os'
import * as path from 'path'

import constants from 'oma/constants'

const { foundationName, navigatorName } = constants

const configuration: ServiceConfiguration = {
  bootDirectory: path.join(os.homedir(), 'oma'),
  frontend: { host: '::1', port: 8443, certification: 'oma/boot/certification' }, backend: [],
  devicePersistence: 13,
  bundleSubdirectory: 'bundle',
  mandatoryBundles: {
    [foundationName]: require(`oma/bundle/${foundationName}`).default,
    [navigatorName]: require(`oma/bundle/${navigatorName}`).default
  }
}

export default configuration