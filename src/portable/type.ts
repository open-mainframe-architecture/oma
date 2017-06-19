export interface Deployment {

  readonly application: string

}

export interface NavigateRequest {

  readonly referrer: string

  readonly timezoneOffset: number
}

export interface NavigatorInfo {

  readonly id: string

  readonly terminalStylePath: string

}
