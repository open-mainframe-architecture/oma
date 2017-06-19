import { Response } from 'oma/http'
import { Agent, Job, Story } from 'oma/theater'
import { Deployment, NavigateRequest, NavigatorInfo } from 'oma/type'

import { Role } from 'oma/theater/play'

const { parse, stringify } = JSON

import * as React from 'react'
import * as ReactDOM from 'react-dom'

import constants from 'oma/constants'

const { addNavigator, navigatorElement, navigatorKey, resetElement, serviceHome } = constants

import * as http from 'oma/http'

const { createURI, send } = http

import Switcher, { SwitcherProps } from 'oma/dom/switcher'

import * as management from 'oma/theater/management'
import * as play from 'oma/theater/play'

const { loose } = management
const { spawn } = play

class Navigator extends Role<Agent> {

  private info: NavigatorInfo

  private *obtainInfo() {
    const storedNavigatorInfo = sessionStorage.getItem(navigatorKey)
    if (storedNavigatorInfo) {
      return parse(storedNavigatorInfo)
    }
    const { body: fetchedNavigatorInfo }: Response = yield send({
      method: 'POST',
      uri: createURI({ path: [serviceHome, addNavigator] }),
      headers: [['Accept', 'application/json'], ['Content-Type', 'application/json']],
      body: stringify({
        referrer: String(location),
        timezoneOffset: new Date().getTimezoneOffset()
      } as NavigateRequest)
    })
    sessionStorage.setItem(navigatorKey, fetchedNavigatorInfo as string)
    return parse(fetchedNavigatorInfo as string)
  }

  public *initialize(): Story<void> {
    const info: NavigatorInfo = this.info = yield* this.obtainInfo()
    console.log(info)
    window.addEventListener('popstate', event => {
      console.log(event)
      console.log(event.state)
    })
    const resetNode = document.getElementById(resetElement) as HTMLLinkElement
    const props: SwitcherProps = {
      base: document.baseURI as string,
      resetStylePath: resetNode.getAttribute('href') as string,
      terminalStylePath: info.terminalStylePath
    }
    ReactDOM.render(React.createElement(Switcher, props), document.getElementById(navigatorElement))
  }

}

export default spawn<Agent>(loose, Navigator)
