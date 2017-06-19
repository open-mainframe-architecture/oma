import { NextFunction, Request, Response } from 'express'

import { CookieJar, ServiceConfiguration } from 'oma/web'

import * as crypto from 'crypto'

const { randomBytes } = crypto

import constants from 'oma/constants'

const { cookieName } = constants

import * as always from 'oma/always'

const { throwError } = always

export function trace(request: Request, response: Response, next: NextFunction) {
  const configuration: ServiceConfiguration = response.locals.configuration || throwError('local configuration is missing')
  const jar: CookieJar = response.locals.jar || throwError('local cookie jar is missing'), sentId = jar[cookieName.device]
  if (sentId) {
    response.locals.device = sentId
  } else {
    const newId = randomBytes(16).toString('hex')
    response.cookie(cookieName.device, newId, { maxAge: configuration.devicePersistence * msPerWeek })
    response.locals.device = newId
  }
  next()
}

const msPerWeek = 7 * 24 * 60 * 60 * 1000