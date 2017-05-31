import { Forensics, Job, Story } from 'oma/theater'
import { Queue } from 'oma/theater/wait'

import * as kernel from 'oma/kernel'

const { console } = kernel.scope<kernel.GlobalScope>()

import * as wait from 'oma/theater/wait'

const { employment, queue } = wait

/**
 * An outlet publishes forensics.
 */
export type Outlet = (forensics: Forensics) => void

/**
 * Register news outlet.
 * An outlet is automatically deregistered when it throws an exception while pubishing the forensics of an incident.
 * @param outlet News outlet to register
 */
export function addOutlet(outlet: Outlet) {
  registeredOutlets.add(outlet)
}

/**
 * Deregister a news outlet.
 * @param outlet News outlet to deregister
 * @returns True if outlet was deregistered, otherwise false
 */
export function removeOutlet(outlet: Outlet) {
  return registeredOutlets.delete(outlet)
}

/**
 * Publish reported forensics asynchronously.
 * @param evidence Queue with collected forensics
 */
export function* publish(evidence: Queue<Forensics>): Story<void> {
  const publishing: Job<void> = yield employment<void>()
  for (; ;) {
    const forensics: Forensics = yield evidence
    if (registeredOutlets.size) {
      for (const outlet of registeredOutlets) {
        try {
          outlet(forensics)
        } catch (problem) {
          const exception = problem instanceof Error ? problem : new Error(problem)
          evidence.enqueue(publishing.gatherForensics(exception))
          registeredOutlets.delete(outlet)
        }        
      }
    } else {
      try {
        // resort to console if outlets are not (yet) defined
        console.error(forensics)
      } catch (ignored) {
        // give up
      }
    }
  }
}

const registeredOutlets = new Set<Outlet>()
