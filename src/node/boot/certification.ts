import * as fs from 'fs'

export default {
  key: fs.readFileSync(require.resolve('oma/asset/localhost.key')),
  cert: fs.readFileSync(require.resolve('oma/asset/localhost.cert'))
}