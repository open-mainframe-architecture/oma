import { Request } from 'express'

import { Story } from 'oma/theater'
import { Deployment } from 'oma/type'
import { Deploy, ServantSkeleton } from 'oma/web'

export default class DeployServant extends ServantSkeleton<Deploy> {

  public findDeploymentTarget(request: Request): Story<Deployment> {
    return {
      application: 'foobar'
    }
  }

}