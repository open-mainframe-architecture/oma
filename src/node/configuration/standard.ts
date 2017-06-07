import { ServiceConfiguration } from 'oma/web'

import * as os from 'os'
import * as path from 'path'

const configuration: ServiceConfiguration = {
  systemConfiguration: 'oma/system.config',
  bootDirectory: path.join(os.homedir(), 'oma'),
  bundleSubdirectory: 'bundle',
  foundationName: 'oma-foundation', foundationModules: ['oma/kernel', 'oma/isolate', 'oma/theater/when'],
  navigatorName: 'oma-navigator', navigatorModules: ['oma/navigator', 'oma/http', 'oma/data/**/*.js']
}

export default configuration