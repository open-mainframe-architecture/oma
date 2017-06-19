import * as React from 'react'
import * as ReactDOM from 'react-dom'

import constants from 'oma/constants'

const { terminalElement } = constants

export interface TerminalProps {
  readonly base: string
  readonly resetStylePath: string
  readonly terminalStylePath: string
}
export interface TerminalState { }

export default class Terminal extends React.Component<TerminalProps, TerminalState> {

  private hasBeenMounted = false

  private readonly renderContents = () => {
    if (this.hasBeenMounted) {
      const frameDocument = this.getDocument()
      if (frameDocument.readyState === 'complete') {
        const isEmptyDocument = frameDocument.querySelector('div') === null
        if (isEmptyDocument) {
          frameDocument.open('text/html', 'replace')
          frameDocument.write(this.initialContent())
          frameDocument.close()
        }
        const mountTarget = frameDocument.getElementById(terminalElement) as HTMLElement
        ReactDOM.render(<div>{this.props.children}</div>, mountTarget)
      } else {
        setTimeout(this.renderContents, 0)
      }
    }
  }

  private initialContent() {
    return `<!doctype html>
<html>
  <head>
    <base href="${this.props.base}">
    <link href="${this.props.resetStylePath}" rel="stylesheet">
    <link href="${this.props.terminalStylePath}" rel="stylesheet">
  </head>
  <body>
    <div id="${terminalElement}"></div>
  </body>
</html>`
  }

  private getDocument() {
    return ReactDOM.findDOMNode<HTMLIFrameElement>(this).contentDocument
  }

  public componentDidMount() {
    this.hasBeenMounted = true
    this.renderContents()
  }

  public render() {
    return <iframe ref={element => console.log('got reffed', element.contentDocument)}></iframe>
  }
}