/**
 * A story explains how a result should be computed.
 */
export type Story<T> = T | Error | Scene

/**
 * A scene is a generator for theater cues, teleprompters and/or promises. Scenes compute asynchronous results of stories.
 * A scene is an iterable iterator over hints. Generators are iterable iterators.
 */
export type Scene = IterableIterator<Hint<any>>

/**
 * A hint to yield in a generator function.
 * It is either a theater cue, a teleprompter with an autocue method or a promise with a then method.
 */
export type Hint<T> = Cue<T> | Teleprompter<T> | Promise<T>

/**
 * A theater cue begins and potentially ends a period of waiting for a job.
 * A cue waits for an action or actions to complete. Cues are charged to start the action.
 * When a cue ignites, it either succeeds with a prompt or it fails with a blooper.
 */
export interface Cue<T> {

  /**
   * Test whether this cue is charged. A charged cue can ignite.
   */
  readonly isCharged: boolean

  /**
   * Precharge this cue to flatten the cue hierarchy.
   * @returns An iterator over parent and child cues
   */
  precharge(parent: Cue<any>, job: Job<any>): IterableIterator<[Cue<any>, Cue<any>]>

  /**
   * Charge this cue to begin an action.
   * @param parent Parent cue that is charging its children
   * @param job Theater job that is charging
   * @throws When this cue is already charged
   */
  charge(parent: Cue<any>, job: Job<any>): void

  /**
   * Witness a blooper. The witnessed forensics can be reported for later analysis.
   * @param blooper Error that occured
   * @returns Theater forensics
   * @throws When this cue is not charged
   */
  witness(blooper: Error): Forensics

  /**
   * Ignite this cue. The ignition is propagated to the parent cue.
   * @param prompt Prompt of ignition or undefined
   * @param blooper Blooper of ignition or undefined
   * @throws When this cue is not charged
   */
  ignite(prompt?: T, blooper?: Error): void

  /**
   * Propagate ignition from offspring.
   * The prompt is significant if and only if the blooper is undefined. Bloopers take precedence over prompts.
   * @param child Child that has propagated ignition upwards to this parent cue
   * @param prompt Prompt of propagated ignition or undefined
   * @param blooper Blooper of propagated ignition or undefined
   * @throws When this cue is not charged
   */
  propagate<U>(child: Cue<U>, prompt?: U, blooper?: Error): void

  /**
   * Discharge this cue when the result is not significant anymore.
   * @throws When this cue is not charged
   */
  discharge(): void

}

/**
 * A theater job is a cancellable unit of work for an actor.
 */
export interface Job<T> extends Teleprompter<T> {

  /**
   * True if this job hasn't run yet, otherwise false.
   */
  readonly isInert: boolean

  /**
   * True if this job is running to compute a result, otherwise false.
   */
  readonly isRunning: boolean

  /**
   * Obtain this job. It will be running if it was inert before.
   */
  readonly running: Job<T>

  /**
   * True if this running job is postponed until it is prompted by a cue, otherwise false.
   */
  readonly isPostponed: boolean

  /**
   * True if busy actor is executing this running job on theater stage, otherwise false.
   */
  readonly isActive: boolean

  /**
   * True if this job has completed with a result, otherwise false.
   */
  readonly hasCompleted: boolean

  /**
   * Obtain final result of this job. An error is thrown when this job hasn't completed yet.
   */
  readonly result: T | Error

  /**
   * True if this job completed with an error result, otherwise false.
   */
  readonly isFailure: boolean

  /**
   * True if this job completed with a successful result, otherwise false.
   */
  readonly isSuccess: boolean

  /**
   * Obtain cue that prompts completion of this job.
   */
  readonly completion: Cue<T | Error>

  /**
   * Obtain cue that prompts successful completion of this job. This is also the autocue.
   */
  readonly success: Cue<T>

  /**
   * Obtain JavaScript promise that resolves with success or rejects with failure.
   */
  readonly promise: Promise<T>

  /**
   * Obtain descriptive, initial purpose of this job.
   */
  readonly purpose: Purpose

  /**
   * Obtain statistics of this job.
   */
  readonly statistics: JobStatistics

  /**
   * A job is a so-called thenable. They should 'play nice' with promises.
   * @param onResolution Called when this job completes with a successful result
   * @param onRejection Called when this job completes with a failure
   * @returns New promise
   */
  then<U>(onResolution?: (result: T) => U, onRejection?: (reason?: any) => any): Promise<U>

  /**
   * Run this job. This only affects inert jobs.
   * @returns True if this job was inert before, otherwise false
   */
  run(): boolean

  /**
   * Quit this job if it is running. Inert and completed jobs are unaffected.
   */
  quit(): void

  /**
   * Create theater forensics.
   * Forensics are usually taken from a managed incident. This method allows forensics to be created without an incident.
   * @param exception Exception information, e.g. stack trace
   * @returns New forensics
   */
  gatherForensics(exception: Error): Forensics

}

/**
 * An agent represents an actor.
 * Agents convert method invocations to actor jobs.
 * They provide a convenient object-oriented interface to initiate asynchronous scenes.
 */
export interface Agent {

  /**
   * Obtain cue that prompts death of represented actor.
   */
  readonly death: Cue<void>

  /**
   * Kill the actor that this agent represents.
   */
  kill(): Job<void>

}

/**
 * A manager is an agent that supervises a team of actors.
 */
export interface Manager extends Agent {

  /**
   * Handle incident that a team member caused on stage.
   * The member will be suspended until incident is handled.
   * @param incident Theater incident
   * @param damage Stage exception or undefined if incident is a suicide attempt
   * @returns Result of offending job
   */
  handleIncident(incident: Incident, damage?: Error): Job<any>

}

/**
 * An actor processes jobs.
 */
export interface Actor<A extends Agent> {

  /**
   * Agent that represents this actor.
   */
  readonly agent: A

  /**
   * True if this actor is suspended from working on jobs, otherwise false.
   */
  readonly isSuspended: boolean

  /**
   * True if this actor is suspended because it caused a problem on stage, otherwise false.
   */
  readonly isInTrouble: boolean

  /**
   * True when this actor is dead, otherwise false.
   * A dead actor is also in trouble and suspended. The problem is the suicide attempt of the dead actor.
   */
  readonly isDead: boolean

  /**
   * True if this actor has jobs to work on, otherwise false.
   * If not suspended, an actor with a workload is ready for a performance on stage.
   */
  readonly hasWorkload: boolean

  /**
   * True if this actor has jobs in its agenda, otherwise false.
   * Jobs in the agenda are blocked by showstoppers that wait for cues to ignite.
   */
  readonly hasAgenda: boolean

  /**
   * Uptime when actor was born.
   */
  readonly timeOfBirth: number

  /**
   * Uptime when actor died. Zero if actor is alive.
   */
  readonly timeOfDeath: number

  /**
   * Depth measures distance to theater director, i.e. number of managers in supervision hierarchy.
   */
  readonly depth: number

  /**
   * Collected statistics of this actor.
   */
  readonly statistics: ActorStatistics

  /**
   * Current role name. A dead actor plays the 'Zombie' role.
   */
  readonly role: string

  /**
   * Obtain theater cue that prompts the death of this actor.
   */
  readonly death: Cue<void>

}

/**
 * A teleprompter is a hint that produces an 'obvious' cue. It is a factory for theater cues.
 */
export interface Teleprompter<T> {

  /**
   * Obtain autocue of this teleprompter.
   * @returns Theater cue
   */
  autocue(): Cue<T>

}

/**
 * Forensics are gathered when a problem occurs.
 */
export interface Forensics {

  /**
   * True if these forensics were collected to manage an incident, otherwise false.
   */
  readonly managed: boolean

  /**
   * Damage caused by problem. If undefined, the problem is a suicide attempt without damage.
   */
  readonly damage?: DamageForensics

  /**
   * Job that actor was performing when problem occured.
   */
  readonly job: JobForensics

  /**
   * Actor that caused problem on stage.
   */
  readonly actor: ActorForensics

  /**
   * Uptime when problem occured.
   */
  readonly uptime: number

  /**
   * Statistics about theater when problem occured.
   */
  readonly statistics: TheaterStatistics

  /**
   * Descriptions of subsidiaries where problem originates.
   * If defined, the problem occured in a subsidiary. Otherwise the problem occured in this environment.
   */
  readonly subsidiaries?: string[]

  /**
   * Forensics are causally connected.
   */
  readonly cause?: Forensics

}

/**
 * An incident is handled by a theater manager.
 */
export interface Incident {

  /**
   * Gathered forensics.
   */
  readonly forensics: Forensics

  /**
   * False if incident has been handled, otherwise true.
   */
  readonly isUnhandled: boolean

  /**
   * Offending agent caused this incident.
   */
  readonly offender: Agent

  /**
   * Handle incidident by ignoring it and allowing the offending actor to continue work.
   * @returns True if this incident was unhandled before, otherwise false
   */
  ignore(): boolean

  /**
   * Handle incidident by punishing offending actor with death sentence.
   * @returns True if this incident was unhandled before, otherwise false
   */
  punish(): boolean

  /**
   * Handle incident by swapping the offending role instance with a new role instance.
   * @param roleConstructor Constructor of new role instance
   * @param parameters Zero or more construction parameters
   * @returns True if this incident was unhandled before, otherwise false
   */
  swap(roleConstructor: Function, ...parameters: any[]): boolean

}

/**
 * Descriptive purpose of a theater job.
 */
export interface Purpose {

  /**
   * Role name of actor that worked first on the job.
   */
  readonly role: string

  /**
   * Scene selector that started the job.
   */
  readonly selector: string

}

/**
 * Collected job statistics.
 */
export interface JobStatistics {

  /**
   * Number of times that the job performed on the theater stage.
   */
  readonly stagePerformances: number

  /**
   * Uptime when the job started running. Zero implies the job hasn't run yet.
   */
  readonly stageBegin: number

  /**
   * Number of seconds that the job has executed on the theater stage.
   */
  readonly stageTime: number

  /**
   * Uptime when the job completed. Zero implies the job hasn't completed yet.
   */
  readonly stageEnd: number

  /**
   * Number of times this job has been forwarded.
   */
  readonly hopCount: number

}

/**
 * Collected actor statistics.
 */
export interface ActorStatistics {

  /**
   * Number of times that actor has performed on the theater stage.
   */
  readonly stagePerformances: number

  /**
   * Number of seconds that actor has occupied the theater stage.
   */
  readonly stageTime: number

}

/**
 * Collected theater statistics.
 */
export interface TheaterStatistics {

  /**
   * Number of stage performances while curtain has been pulled open.
   */
  readonly pullPerformances: number

  /**
   * Number of times that the theater curtain has been pulled open to schedule stage performances.
   */
  readonly pullCount: number

  /**
   * Number of seconds that the curtain has been pulled open.
   */
  readonly pullTime: number

  /**
   * Number of times that the curtain has been pulled open for too long. The limit is set at 8 ms.
   */
  readonly overrunCount: number

  /**
   * Number of seconds that the curtain has been pulled open for too long.
   */
  readonly overrunTime: number

  /**
   * Number of times that the curtain was opened to handle an interrupt.
   */
  readonly surpriseCount: number

  /**
   * Number of seconds that the curtain was opened to handle an interrupt.
   */
  readonly surpriseTime: number

}

/**
 * Forensics about errors.
 */
export interface DamageForensics {

  /**
   * Class name of error object.
   */
  readonly class: string

  /**
   * Error message.
   */
  readonly message: string

  /**
   * Stack trace.
   */
  readonly stack: string

}

/**
 * Forensics about job that caused problem.
 */
export interface JobForensics {

  /**
   * Descriptive purpose.
   */
  readonly purpose: Purpose

  /**
   * Statistics about job.
   */
  readonly statistics: JobStatistics

}

/**
 * Forensics about offending actor.
 */
export interface ActorForensics {

  /**
   * Role name that actor was playing when problem occured.
   */
  readonly role: string

  /**
   * Role name of manager.
   */
  readonly manager: string

  /**
   * Supervision depth.
   */
  readonly depth: number

  /**
   * Statistics about actor.
   */
  readonly statistics: ActorStatistics

}

/**
 * An actor generates an improvisation error when it does not understand a scene selector.
 */
export class Improvisation extends Error {

  /**
   * Construct improvisation.
   * @param selector Unknown scene selector
   * @param role Role name of offending actor
   */
  constructor(selector: string, role: string) {
    super(`scene ${selector} in role ${role}`)
  }

}

/**
 * A termination error is the result of a job that was unexpectedly quit.
 */
export class Termination extends Error {
}

/**
 * A testimony reveals the forensics of another error.
 */
export class Testimony extends Error {

  constructor(public readonly forensics: Forensics) {
    super('causality')
  }

}

/**
 * An unsupervised error is reserved for the theater director. This should not happen!
 */
export class Unsupervised extends Error {
}
