import * as React from 'react'

import Terminal from 'oma/dom/terminal'

export interface SwitcherProps {
  readonly base: string
  readonly resetStylePath: string
  readonly terminalStylePath: string
}
export interface SwitcherState { }

export default class Switcher extends React.Component<SwitcherProps, SwitcherState> {

  public render() {
    return <div>
      <Terminal
        base={this.props.base}
        resetStylePath={this.props.resetStylePath}
        terminalStylePath={this.props.terminalStylePath}
      >
        <a href="to/some/deeply/nested/location" onClick={event => {
          event.preventDefault()
          history.pushState({ foo: 42 }, 'Whatever', 'to/some/deeply/nested/location')
          const anchor = event.target as HTMLAnchorElement
          console.log(anchor.getAttribute('href'))
        }}>Testing a link</a>
      </Terminal>
    </div>
  }
}