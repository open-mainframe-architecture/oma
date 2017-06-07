import {
  ActorForensics,
  ActorStatistics,
  Agent,
  Cue,
  DamageForensics,
  Hint,
  JobForensics,
  JobStatistics,
  Manager,
  Purpose,
  Scene,
  Story,
  TheaterStatistics
} from 'oma/theater'

const { max } = Math
const { assign } = Object
const { revocable } = Proxy
const { apply, has, get, construct } = Reflect

import * as always from 'oma/always'
import * as kernel from 'oma/kernel'
import * as status from 'oma/status'
import * as theater from 'oma/theater'

const { returnK, returnNothing, returnThis, throwError } = always
const { asap, uptime } = kernel
const { ExclusiveSet, release } = status
const { Improvisation, Termination, Testimony, Unsupervised } = theater

const { clearTimeout, setTimeout } = kernel.scope<kernel.GlobalScope>()

import * as news from 'oma/theater/news'
import * as wait from 'oma/theater/wait'

const { publish } = news
const { AbstractCue, Group, queue, signal, spark } = wait

/**
 * A theater role encapsulates the state of an actor.
 */
export abstract class Role<A extends Agent> {

  /**
   * Obtain the busy actor that is playing this role instance on stage.
   * @throws When this role is not playing on stage
   */
  protected get busy(): theater.Actor<A> {
    const actor = busy.first
    if (actor.playing(this)) {
      return <Actor<A>>actor
    }
    throw new Error('role is not busy on stage')
  }

  /**
   * Obtain the agent that represents the busy actor of this role instance.
   * @throws When this role is not playing on stage
   */
  protected get self() {
    return this.busy.agent
  }

  /**
   * Clean up when this role instance is no longer needed.
   * This role instance is disposed when the actor dies or when the actor swaps this instance for another.
   */
  public dispose(): void {
  }

  /**
   * Improvise when this role instance does not understand a scene selector.
   * Default implementation returns an improvisation error.
   * @param selector Unknown scene selector
   * @param parameters Scene parameters
   * @returns Result of unknown scene
   */
  public improviseStory<T>(selector: string, parameters: any[]): Story<T> {
    return new Improvisation(selector, this.constructor.name)
  }

  /**
   * Intialize new role instance for an actor.
   * @returns Scene for asynchronous initialization or nothing
   */
  public initialize(): Story<void> {
  }

  /**
   * Commit suicide on stage.
   */
  public kill() {
    throw new PoisonPill()
  }

}

/**
 * Is the theater entertaining, because the curtain is open?
 * @returns True if curtain is open, otherwise false
 */
export function entertaining() {
  return curtainOpen
}

/**
 * Spawn an actor/agent/role combination.
 * @param manager Manager of new combination
 * @param roleConstructor Constructor of new role
 * @param parameters Role construction parameters
 * @returns New agent
 */
export function spawn<A extends Agent>(manager: Manager, roleConstructor: Function, ...parameters: any[]) {
  return new Actor<A>(roleConstructor, actorOf(manager), parameters).agent
}

/**
 * Enter stage for a surprise act when curtain is closed, e.g. to handle an interrupt.
 * @param job Inert job that performs surprise act
 */
export function surprise(job: theater.Job<any>) {
  sneaky(<Job<any>>job)
}

/**
 * Create theater cue that prompts after a number of seconds have passed.
 * @param seconds Number of seconds to delay
 * @returns Theater cue
 */
export function sleep(seconds: number) {
  return seconds <= 0 ? spark<void>() : new Moment(seconds)
}

/**
 * Create theater cue that prompts when the uptime passes a deadline.
 * @param deadline Uptime deadline
 * @returns New theater cue
 */
export function pause(deadline: number) {
  return deadline <= 0 ? spark<void>() : new Moment(0, deadline)
}

/**
 * Create theater cue that prompts an inert job for the busy actor on stage.
 * A rehearsal prepares for the job, but it does not actually run the job.
 * @param script Script to perform in job
 * @returns New theater cue that prompts an inert job
 */
export function rehearse<T>(script: () => Story<T>): Cue<theater.Job<T>> {
  return new Fork<T>(false, script)
}

/**
 * Create theater cue that prompts a running job for the busy actor on stage.
 * @param script Script to perform in job
 * @returns New theater cue that prompts a running job
 */
export function run<T>(script: () => Story<T>): Cue<theater.Job<T>> {
  return new Fork<T>(true, script)
}

/**
 * Execute code with a job on the theater stage.
 * @param script Script to perform in job
 * @returns The running job that executes the code
 */
export function execute<T>(script: () => Story<T>): theater.Job<T> {
  return janitor.execute(script).running
}

/**
 * Report about problems on stage.
 * @param forensics Problem forensics
 */
export function report(forensics: theater.Forensics) {
  evidence.enqueue(forensics)
}

/**
 * Obtain theater statistics.
 * @returns Latest theater statistics
 */
export function statistics(): TheaterStatistics {
  return assign({}, stats)
}

// scene selector is either a method name or a method closure.
type Selector = string | ((...parameters: any[]) => Story<any>)

// a job for an actor
class Job<T> implements theater.Job<T> {

  private readonly initialPurpose: Purpose

  private readonly stats = { stageTime: 0, stagePerformances: 0, stageBegin: 0, stageEnd: 0, hopCount: -1 }

  private performing: boolean | null = null

  private employee: Actor<Agent>

  private selector: Selector

  private parameters: any[]

  private scene: Scene | null

  private showstopper: Showstopper | null

  private completions: Completions<T | Error>

  private finalResult: T | Error

  private block(hint: Hint<any>) {
    const showstopper = this.showstopper = new Showstopper(this, signal(hint))
    showstopper.block()
    this.repost()
  }

  private forward(actor: Actor<Agent>, selector: Selector, parameters: any[]) {
    ++this.stats.hopCount
    this.employee = actor
    this.selector = selector
    this.parameters = parameters
  }

  constructor(actor: Actor<Agent>, selector: Selector, parameters: any[], initialPurpose?: Purpose) {
    this.completions = new Completions<T | Error>(this)
    this.forward(actor, selector, parameters)
    this.initialPurpose = initialPurpose || {
      selector: typeof selector === 'string' ? selector : selector.name || 'anonymous code',
      role: actor.role
    }
  }

  public get actor() {
    return this.employee
  }

  public get interrupting() {
    if (this.performing === null) {
      this.performing = true
      return this
    }
  }

  public get running() {
    this.run()
    return this
  }

  public get isInert() {
    return this.performing === null
  }

  public get isRunning() {
    return !!this.performing
  }

  public get hasCompleted() {
    return this.performing === false
  }

  public get isPostponed() {
    return !!this.showstopper && this.showstopper.isCharged
  }

  public get isActive() {
    return active.has(this)
  }

  public get result() {
    if (this.performing !== false) {
      throw new Error('job result is not available before completion')
    }
    return this.finalResult
  }

  public get isFailure() {
    return this.finalResult instanceof Error
  }

  public get isSuccess() {
    return this.performing === false && !(this.finalResult instanceof Error)
  }

  public get completion(): Cue<T | Error> {
    return this.completions.member
  }

  public get promise(): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.performing === false) {
        const result = this.finalResult
        if (result instanceof Error) {
          reject(result)
        } else {
          resolve(result)
        }
      } else {
        janitor.pledge(this.completion, resolve, reject).run()
      }
    })
  }

  public get success(): Cue<T> {
    return new Success(<Completions<T>>this.completions)
  }

  public get purpose() {
    return this.initialPurpose
  }

  public get statistics(): JobStatistics {
    return assign({}, this.stats)
  }

  public then<U>(onFulfilled?: (result: T) => U, onRejected?: (reason?: any) => any): Promise<U> {
    const promise = this.promise
    return onFulfilled ? promise.then(onFulfilled, onRejected) : onRejected ? promise.then(null, onRejected) : promise
  }

  public autocue() {
    return this.success
  }

  public repost() {
    this.employee.post(this)
  }

  public performOnStage() {
    if (!this.performing) {
      throw new Error('stage performance requires a running job')
    }
    let iteration: IteratorResult<any>
    if (this.scene) {
      const showstopper = this.showstopper || throwError('existing scene needs a showstopper to continue')
      this.showstopper = null
      iteration = showstopper.continue(this.scene)
    } else {
      this.scene = this.employee.beginScene(this.selector, this.parameters)
      iteration = this.scene.next()
    }
    if (iteration.done) {
      this.return(iteration.value)
    } else {
      this.block(iteration.value)
    }
  }

  public takeCredits(performer: Actor<Agent>, begin: number, end: number) {
    const stats = this.stats
    if (!stats.stageBegin) {
      stats.stageBegin = begin
    }
    ++stats.stagePerformances
    stats.stageTime += end - begin
    if (!this.performing) {
      stats.stageEnd = end
    }
  }

  public return(result: T | Error | Job<T>) {
    if (!this.performing) {
      throw new Error('job cannot return if it is not running')
    }
    if (this.showstopper) {
      throw new Error('job with showstopper cannot return')
    }
    if (this === result) {
      throw new Error('cyclic job continuation')
    }
    // cut the scene when job returns
    this.scene = null
    if (result instanceof Job) {
      const job = result
      if (job.performing) {
        this.scene = closingScene(job)
        this.block(this.scene.next().value)
      } else if (job.performing === false) {
        this.return(job.result)
      } else {
        this.forward(job.employee, job.selector, job.parameters)
        this.repost()
      }
    } else {
      this.performing = false
      this.finalResult = result
      this.completions.igniteAll()
      release(this)
      reschedule(this.employee)
    }
  }

  public run() {
    if (this.performing === null) {
      this.performing = true
      this.repost()
      return true
    }
    return false
  }

  public quit() {
    if (this.performing) {
      const showstopper = this.showstopper
      this.showstopper = null
      this.return(new Termination())
      if (showstopper && showstopper.isCharged) {
        showstopper.discharge()
      }
    }
  }

  public gatherForensics(exception: Error): theater.Forensics {
    return testify(false, this, exception)
  }

}

// closing scene is performed when some job returns with the result of another running job
function* closingScene<T>(runningJob: Job<T>): IterableIterator<Hint<any>> {
  const result: T = yield runningJob
  return result
}

// a story is an asynchronous scene if it is an iterable iterator, e.g. a generator of hints
function asynchronous(story: Story<any>): story is Scene {
  return story && typeof story[Symbol.iterator] === 'function' && typeof story.next === 'function'
}

// invoke selected story on role instance
function invokeStory<A extends Agent>(instance: Role<A>, selector: Selector, parameters: any[]) {
  return typeof selector === 'function' ? apply(selector, instance, parameters) :
    has(instance, selector) ? apply(get(instance, selector), instance, parameters) :
      instance.improviseStory(selector, parameters)
}

// showstopper is root cue that blocks a job
class Showstopper extends AbstractCue<any> {

  private prompt: any

  private blooper: Error

  protected begin(job: theater.Job<any>) {
  }

  constructor(
    private readonly job: Job<any>,
    private readonly cue: Cue<any>
  ) {
    super()
  }

  public block() {
    const job = this.job
    for (const [parent, child] of this.precharge(this, job)) {
      if (this.isCharged) {
        try {
          child.charge(parent, job)
        } catch (problem) {
          child.ignite(void 0, problem instanceof Error ? problem : new Error(problem))
        }
      } else {
        break
      }
    }
  }

  public continue(scene: Scene) {
    if (this.isCharged) {
      throw new Error('showstopper cannot continue if still charged')
    }
    const blooper = this.blooper
    if (blooper) {
      if (scene.throw) {
        return scene.throw(blooper)
      } else {
        throw blooper
      }
    } else {
      return scene.next(this.prompt)
    }
  }

  public precharge(parent: Cue<any>, job: theater.Job<any>): IterableIterator<[Cue<any>, Cue<any>]> {
    this.charge(parent, job)
    return this.cue.precharge(this, job)
  }

  public witness(blooper: Error) {
    if (!this.isCharged) {
      throw new Error('showstopper cannot witness a blooper if not charged')
    }
    return this.job.gatherForensics(blooper)
  }

  public propagate<T>(child: Cue<any>, prompt?: T, blooper?: Error) {
    if (!this.isCharged) {
      throw new Error('showstopper cannot propagate if not charged')
    }
    if (child !== this.cue) {
      throw new Error('bad child cue in showstopper propagation')
    }
    if (blooper) {
      this.blooper = blooper
    } else {
      this.prompt = prompt
    }
    super.discharge()
    this.job.repost()
  }

  public discharge() {
    this.cue.discharge()
    super.discharge()
  }

}

// completion group with theater cues for job results
class Completions<T> extends Group<T> {

  private controller: wait.GroupMember<T> | null

  constructor(public readonly job: Job<T>) {
    super(() => job.hasCompleted, () => <T>job.result)
  }

  public addCharged(member: wait.GroupMember<T>) {
    if (this.job.run()) {
      this.controller = member
    }
    return super.addCharged(member)
  }

  public deleteCharged(member: wait.GroupMember<T>, discharged: boolean) {
    if (member === this.controller) {
      this.controller = null
      if (discharged) {
        this.job.quit()
      }
    }
    return super.deleteCharged(member, discharged)
  }

}

// theater cue that prompts successful result of job or fails with blooper
class Success<T> extends wait.GroupMember<T> {

  protected group: Completions<T>

  public ignite(prompt?: T, blooper?: Error) {
    const job = this.group.job
    super.ignite(prompt, !blooper && job.isFailure ? <Error>job.result : blooper)
  }

}

// a fork prompts a running or inert job for the busy actor
class Fork<T> extends AbstractCue<theater.Job<T>> {

  protected begin(job: Job<any>) {
    const forked = new Job<T>(job.actor, this.script, [])
    this.ignite(this.running ? forked.running : forked)
  }

  constructor(private readonly running: boolean, private readonly script: () => Story<T>) {
    super()
  }

}

// status with at most one active job
const active = new ExclusiveSet<Job<any>>('active')

// reference for agent traps
type AgentReference<A extends Agent> = theater.Actor<A> | A

// private, symbolic property of agents
const privateActor = Symbol('actor')

// traps of agent proxy
const agentTraps = {
  get<A extends Agent>(actor: Actor<A>, selector: string | symbol) {
    return selector === privateActor ? actor :
      selector === 'death' ? actor.death :
        typeof selector === 'string' ? actor.createStoryMethod(selector) :
          undefined
  }
}

// access 'private' actor of an agent
function actorOf<A extends Agent>(agent: A): Actor<A> {
  return (<any>agent)[privateActor]
}

// skip disposal if a role does not redefine the default dispose method
const skipDisposal = Role.prototype.dispose

function scheduleDisposal(roleInstance: Role<Agent>) {
  const disposal = roleInstance.dispose
  if (disposal !== skipDisposal) {
    janitor.clean(roleInstance).run()
  }
}

// an actor performs scenes on stage
class Actor<A extends Agent> implements theater.Actor<A> {

  // workload with jobs to work on
  private readonly workload = new ExclusiveSet<Job<any>>('working')

  // agenda with jobs to work on when a showstopper prompts
  private readonly agenda = new ExclusiveSet<Job<any>>('postponed')

  private readonly teamSubordinates = new Set<Actor<Agent>>()

  // cache stories of scene methods
  private readonly storyMethods: { [selector: string]: (...parameters: any[]) => Job<any> } = {}

  // obituaries prompt death of this actor
  private readonly obituaries = new Group<void>(() => !this.roleInstance, returnNothing)

  private readonly stats = { stageTime: 0, stagePerformances: 0 }

  private readonly birthTime: number

  // revocable proxy of personal agent
  private readonly personalAgent: { readonly proxy: AgentReference<A>, revoke: () => void }

  private readonly supervisionDepth: number

  private readonly workSupervisor: Actor<Manager>

  // false if not suspended, true if suspended without reason, otherwise error that caused suspension
  private suspensionReason: boolean | Error = false

  // role instance with actor state
  private roleInstance: Role<A> | null

  private deathTime = 0

  // install first role instance or swap existing instance for a new one
  private installRoleInstance(roleConstructor: Function, parameters: any[]) {
    this.roleInstance = <Role<A>>construct(roleConstructor, parameters)
    const initialization = this.roleInstance.initialize()
    if (asynchronous(initialization)) {
      new Job(this, function initialize() { return initialization }, []).run()
    }
  }

  constructor(roleConstructor: Function, supervisor?: Actor<Manager>, parameters: any[] = []) {
    this.birthTime = uptime()
    this.personalAgent = revocable<AgentReference<A>>(this, agentTraps)
    if (supervisor) {
      this.supervisionDepth = supervisor.depth + 1
      this.workSupervisor = supervisor
      supervisor.teamSubordinates.add(this)
    } else {
      this.supervisionDepth = 0
    }
    this.installRoleInstance(roleConstructor, parameters)
  }

  public get agent() {
    return <A>this.personalAgent.proxy
  }

  public get death(): Cue<void> {
    return this.obituaries.member
  }

  public get depth() {
    return this.supervisionDepth
  }

  public get hasAgenda() {
    return this.agenda.size > 0
  }

  public get hasWorkload() {
    return this.workload.size > 0
  }

  public get isDead() {
    return !this.roleInstance
  }

  public get isInTrouble() {
    return typeof this.suspensionReason !== 'boolean'
  }

  public get isSuspended() {
    return !!this.suspensionReason
  }

  public get role() {
    return this.roleInstance ? this.roleInstance.constructor.name : 'Zombie'
  }

  public get statistics(): ActorStatistics {
    return assign({}, this.stats)
  }

  public get supervisor() {
    return this.workSupervisor
  }

  public get team() {
    return this.teamSubordinates.values()
  }

  public get timeOfBirth() {
    return this.birthTime
  }

  public get timeOfDeath() {
    return this.deathTime
  }

  public beginScene(selector: Selector, parameters: any[]): Scene {
    const roleInstance = this.roleInstance || throwError('dead actor cannot begin a new scene')
    const story = invokeStory(roleInstance, selector, parameters)
    return asynchronous(story) ? story : {
      [Symbol.iterator]: returnThis,
      next: returnK({ done: true, value: story })
    }
  }

  public bury() {
    if (!this.suspensionReason) {
      throw new Error('burial requires suspended actor')
    }
    const roleInstance = this.roleInstance
    if (roleInstance) {
      this.deathTime = uptime()
      this.personalAgent.revoke()
      for (const member of this.teamSubordinates) {
        member.bury()
      }
      this.workSupervisor.teamSubordinates.delete(this)
      this.roleInstance = null
      this.obituaries.igniteAll()
      for (const job of [...this.workload, ...this.agenda]) {
        job.quit()
      }
      scheduleDisposal(roleInstance)
      reschedule(this)
    }
  }

  public createStoryMethod(selector: string) {
    const methods = this.storyMethods
    return methods[selector] || (methods[selector] = (...parameters: any[]) => new Job<any>(this, selector, parameters))
  }

  public playing(instance: Role<Agent>) {
    return this.roleInstance === instance
  }

  public post(job: Job<any>) {
    if (!this.roleInstance) {
      throw new Error('dead actor cannot post job')
    }
    if (!job.isRunning) {
      throw new Error('a posted job must be running')
    }
    if (job.isPostponed) {
      this.agenda.add(job)
    } else {
      this.workload.add(job)
    }
    reschedule(this)
  }

  public proceed(roleConstructor?: Function, parameters?: any[]) {
    if (typeof this.suspensionReason === 'boolean') {
      throw new Error('actor must be in trouble to proceed')
    }
    const roleInstance = this.roleInstance || throwError('dead actor cannot proceed')
    if (roleConstructor) {
      this.installRoleInstance(roleConstructor, parameters || [])
      scheduleDisposal(roleInstance)
    }
    this.resume()
  }

  public resume() {
    if (!this.roleInstance) {
      throw new Error('dead actor cannot resume')
    }
    if (!this.suspensionReason) {
      throw new Error('actor cannot resume if it is not suspended')
    }
    this.suspensionReason = false
    reschedule(this)
    for (const member of this.teamSubordinates) {
      member.resume()
    }
  }

  public suspend(reason?: Error) {
    if (!this.roleInstance) {
      throw new Error('dead actor cannot suspend')
    }
    if (!this.suspensionReason) {
      this.suspensionReason = reason || true
      reschedule(this)
      for (const member of this.teamSubordinates) {
        member.suspend()
      }
    }
  }

  public takeCredits(job: Job<any>, begin: number, end: number) {
    const stats = this.stats
    ++stats.stagePerformances
    stats.stageTime += end - begin
    job.takeCredits(this, begin, end)
  }

  public takeStage(nextJob?: Job<any>) {
    if (this.suspensionReason) {
      throw new Error('suspended actor cannot take stage')
    }
    if (!nextJob && !this.workload.size) {
      throw new Error('actor has nothing to do on stage')
    }
    const job = nextJob || this.workload.first
    if (!job.isRunning) {
      throw new Error('active job must be running')
    }
    active.add(job)
    try {
      job.performOnStage()
    } catch (problem) {
      const supervisor = this.workSupervisor
      if (!supervisor) {
        job.return(new Unsupervised(problem))
      } else {
        const exception = problem instanceof Error ? problem : new Error(problem)
        this.suspend(exception)
        const damage = exception instanceof PoisonPill ? void 0 : exception
        const incident = new Incident(job, damage)
        report(incident.forensics)
        job.return(supervisor.agent.handleIncident(incident, damage))
      }
    }
    active.clear()
    reschedule(this)
    return job
  }

}

// actors play on stage when curtain is open
let curtainOpen = false

// collect theater statistics
const stats = {
  pullCount: 0, pullPerformances: 0, pullTime: 0,
  overrunCount: 0, overrunTime: 0,
  surpriseCount: 0, surpriseTime: 0
}

// try to keep curtain open for at most 8ms (register overrun when budget is exhausted)
const curtainBudget = 0.008

// pull cord to open curtain
function pullCord() {
  if (curtainOpen) {
    throw new Error('cannot pull curtain cord when curtain is already open')
  }
  curtainOpen = true
  ++stats.pullCount
  const opening = awakeNow(), deadline = opening + curtainBudget
  for (let now = opening; ready.size && now <= deadline; ++stats.pullPerformances) {
    const actor = ready.first
    busy.add(actor)
    actor.takeCredits(actor.takeStage(), now, now = awakeNow())
  }
  const closing = sleepNow()
  stats.pullTime += closing - opening
  if (closing > deadline) {
    ++stats.overrunCount
    stats.overrunTime += closing - deadline
  }
  curtainOpen = false
}

// one-time surprise performance
function sneaky(job: Job<any>) {
  if (curtainOpen) {
    throw new Error('cannot interrupt theater when curtain is open')
  }
  if (!job.isInert) {
    throw new Error('interrupting job must be inert')
  }
  const actor = job.actor
  if (actor.isSuspended) {
    job.run()
  } else {
    curtainOpen = true
    ++stats.surpriseCount
    const opening = uptime()
    busy.add(actor)
    actor.takeStage(job.interrupting)
    const closing = sleepNow()
    actor.takeCredits(job, opening, closing)
    stats.surpriseTime += closing - opening
    curtainOpen = false
  }
}

// true if already waking up asap
let wakingUp = false

// woken up as soon as possible
function wokenUpSoon() {
  wakingUp = false
  pullCord()
}

// wake up as soon as possible.
function wakeUpSoon() {
  if (!wakingUp) {
    wakingUp = true
    asap(wokenUpSoon)
  }
}

// at most one busy actor
const busy = new ExclusiveSet<Actor<Agent>>('busy')

// ready actors want to go on stage to work on jobs in their workloads
const ready = new ExclusiveSet<Actor<Agent>>('ready')

// waiting actors with jobs in their agendas, but not in their workloads
const waiting = new ExclusiveSet<Actor<Agent>>('waiting')

// suspended actors have been suspended without a reason
const suspended = new ExclusiveSet<Actor<Agent>>('suspended')

// troubled actors remain in trouble until their incidents are handled
const troubled = new ExclusiveSet<Actor<Agent>>('troubled')

// idle actors have nothing to do and nothing planned in their agendas
const idle = new ExclusiveSet<Actor<Agent>>('idle')

// add actor to appropriate status, or release it from its status when it's dead
function reschedule(actor: Actor<Agent>) {
  if (actor.isDead) {
    release(actor)
  } else if (actor.isInTrouble) {
    troubled.add(actor)
  } else if (actor.isSuspended) {
    suspended.add(actor)
  } else if (actor.hasWorkload) {
    ready.add(actor)
    if (!curtainOpen && !wakingUp) {
      wakeUpSoon()
    }
  } else if (actor.hasAgenda) {
    waiting.add(actor)
  } else {
    idle.add(actor)
  }
}

// array with charged moments, sorted on deadlines
const chargedMoments: Moment[] = []

// a theater cue that prompts a moment in time
class Moment extends AbstractCue<void> {

  protected begin(job: theater.Job<any>) {
    const now = uptime(), deadline = this.deadline || (this.deadline = now + this.seconds)
    if (deadline > now) {
      let i = 0, j = chargedMoments.length
      while (i < j) {
        const probe = Math.floor((i + j) / 2)
        if (chargedMoments[probe].deadline <= deadline) {
          i = probe + 1
        } else {
          j = probe
        }
      }
      chargedMoments.splice(i, 0, this)
    } else {
      this.ignite()
    }
  }

  protected end(discharged: boolean) {
    if (discharged) {
      const index = chargedMoments.indexOf(this)
      if (index < 0) {
        throw new Error('cannot end discharged moment if it is not charged')
      }
      chargedMoments.splice(index, 1)
    }
  }

  constructor(public readonly seconds: number, public deadline = 0) {
    super()
  }

}

// allow for some inaccuracy when moments ignite
const deadlineAccuracy = 0.001

// ignite clock moments that have now passed
function awakeNow() {
  const now = uptime(), inaccurately = now + deadlineAccuracy
  let moment: Moment
  while ((moment = chargedMoments[0]) && moment.deadline <= inaccurately) {
    chargedMoments.shift()
    moment.ignite()
  }
  return now
}


// first deadline that has been scheduled
let firstDeadline = 0

// woken up for first deadline
function wokenUpLater() {
  firstDeadline = 0
  pullCord()
}

// timeout handle of first deadline
let firstTimeout: kernel.OpaqueTimer

// sleep to give up control until it's time to wake up
function sleepNow() {
  const now = uptime()
  if (ready.size) {
    // wake up soon from light sleep, because there are actors ready to go on stage
    wakeUpSoon()
  } else if (chargedMoments.length) {
    // wake up for first deadline
    const deadline = chargedMoments[0].deadline
    // nothing to do if first deadline is already scheduled
    if (deadline !== firstDeadline) {
      if (firstDeadline) {
        clearTimeout(firstTimeout)
      }
      firstDeadline = deadline
      firstTimeout = setTimeout(wokenUpLater, max(0, (deadline - now) * 1000))
    }
  }
  return now
}

// actors swallow poison pills to commit suicide
class PoisonPill extends Error {
}

// create forensics from damage
function testify(managed: boolean, job: Job<any>, damage?: Error) {
  return new Forensics(managed, job, damage, damage instanceof Testimony ? damage.forensics : void 0)
}

// theater forensics
class Forensics implements theater.Forensics {

  constructor(public readonly managed: boolean, job: Job<any>, damage?: Error, cause?: theater.Forensics) {
    if (damage) {
      this.damage = {
        class: damage.constructor.name,
        message: damage.message,
        stack: damage.stack || 'unknown trace'
      }
    }
    this.job = {
      purpose: job.purpose,
      statistics: job.statistics
    }
    const actor = job.actor
    this.actor = {
      role: actor.role,
      manager: actor.supervisor ? actor.supervisor.role : 'unsupervised',
      depth: actor.depth,
      statistics: actor.statistics
    }
    this.statistics = statistics()
    this.cause = cause
    this.uptime = uptime()
  }

  public readonly damage?: DamageForensics

  public readonly job: JobForensics

  public readonly actor: ActorForensics

  public readonly uptime: number

  public readonly statistics: TheaterStatistics

  public readonly cause?: theater.Forensics

}

// managers handle incidents
class Incident implements theater.Incident {

  private handled = false

  private readonly actor: Actor<Agent>

  constructor(job: Job<any>, damage?: Error) {
    this.actor = job.actor
    this.forensics = testify(true, job, damage)
  }

  public readonly forensics: theater.Forensics

  public get isUnhandled() {
    return !this.handled
  }

  public get offender() {
    return this.actor.agent
  }

  public ignore() {
    if (!this.handled) {
      this.handled = true
      this.actor.proceed()
      return true
    }
    return false
  }

  public punish() {
    if (!this.handled) {
      this.handled = true
      this.actor.bury()
      return true
    }
    return false
  }

  public swap(roleConstructor: Function, ...parameters: any[]) {
    if (!this.handled) {
      this.handled = true
      this.actor.proceed(roleConstructor, parameters)
      return true
    }
    return false
  }

}

/**
 * The director represents the only unsupervised actor in a theater.
 * It is the first agent to be created and it represents the root of the supervision hierarchy.
 * The director and its team members are immortal.
 */
export const { agent: director } = new Actor<Manager>(class Director extends Role<Manager> {

  public handleIncident(incident: theater.Incident, damage?: Error) {
    // ignore all incidents, including suicide attempts without damage
    incident.ignore()
    return damage
  }

})

// janitor has various tasks, e.g. keeping the theater tidy
interface Janitor extends Agent {
  clean(roleInstance: Role<Agent>): theater.Job<void>
  execute<T>(script: () => Story<T>): theater.Job<T>
  pledge(cue: Cue<any>, resolve: (result: any) => void, reject: (reason?: any) => void): theater.Job<void>
}

// collect forensics in evidence queue
const evidence = queue<theater.Forensics>()

const janitor = spawn<Janitor>(director, class $Janitor extends Role<Janitor> {

  public *initialize() {
    yield run<void>(function publishing() { return publish(evidence) })
  }

  public clean(roleInstance: Role<Agent>) {
    return roleInstance.dispose()
  }

  public execute<T>(script: () => Story<T>) {
    return script()
  }

  // resolve or reject ignition of theater cue
  public *pledge(cue: Cue<any>, resolve: (result: any) => void, reject: (reason?: any) => void) {
    const result: any = yield cue
    if (result instanceof Error) {
      reject(result)
    } else {
      resolve(result)
    }
  }

})
