import { NextFunction, Request, Response } from 'express'

import { CookieJar } from 'oma/web'

const { create } = Object

import * as crypto from 'crypto'

const { createHmac, randomBytes } = crypto

import constants from 'oma/constants'

const { cookieName } = constants

import * as always from 'oma/always'

const { throwError } = always

export function authenticate(request: Request, response: Response, next: NextFunction) {
  const jar: CookieJar = response.locals.jar || throwError('local cookie jar is missing'), sentId = jar[cookieName.guest]
  if (sentId && computeDigest(Buffer.from(sentId, 'hex'), Buffer.from(jar[cookieName.ticket], 'hex')) === guests[sentId]) {
    response.locals.guest = sentId
  } else {
    const idBytes = randomBytes(16), newId = idBytes.toString('hex'), ticketBytes = randomBytes(16)
    guests[newId] = computeDigest(idBytes, ticketBytes)
    response.cookie(cookieName.guest, newId)
    response.cookie(cookieName.ticket, ticketBytes.toString('hex'), { httpOnly: true, secure: true })
    response.locals.guest = newId
  }
  next()
}

const guests: { [id: string]: string } = create(null)

function computeDigest(data: Buffer, secret: Buffer) {
  return createHmac('md5', secret).update(data).digest('hex')
}
