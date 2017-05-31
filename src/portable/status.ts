import * as always from 'oma/always'
import * as loop from 'oma/loop'

const { throwError } = always
const { map } = loop

/**
 * A status is an exclusive set.
 * Something is either contained in one status or it is not contained in any status.
 */
export class ExclusiveSet<T> implements Iterable<T> {

  /**
   * Link to first member if this status is not empty.
   */
  private firstLink: DoubleLink<T> | null

  /**
   * Number of members in this status.
   */
  private memberCount = 0

  /**
   * Construct empty status.
   * @param statusName Optional name of new status defaults to 'a status'
   */
  constructor(private readonly statusName: string = 'a status') {
  }

  /**
   * Get first member of this nonempty status. The first member is the oldest member.
   * @throws When this status is empty
   */
  public get first() {
    const firstLink = this.firstLink || throwError('empty status does not have a first member')
    return firstLink.member
  }

  /**
   * Get last member of this nonempty status. The last member is the youngest member.
   * @throws When this status is empty
   */
  public get last() {
    const firstLink = this.firstLink || throwError('empty status does not have a last member')
    return (<DoubleLink<T>>firstLink.previous).member
  }

  /**
   * Get descriptive name of this status.
   */
  public get name() {
    return this.statusName
  }

  /**
   * Count number of members in this status.
   */
  public get size() {
    return this.memberCount
  }

  /**
   * Iterate over status members. The result is undefined if this status is changed while being iterated.
   * @returns Iterator over the members of this status
   */
  public *[Symbol.iterator]() {
    const firstLink = this.firstLink
    if (firstLink) {
      let link = firstLink
      do {
        yield link.member
        link = <DoubleLink<T>>link.next
      } while (link !== firstLink)
    }
  }

  /**
   * Add member to this status.
   * @param member Member to add
   * @returns This status
   */
  public add(member: T): this {
    const link = linkedMembers.get(member) || createLink(member, this)
    if (link.next) {
      const old = link.status
      if (old === this) {
        return this
      }
      if (--old.memberCount === 0) {
        old.firstLink = null
      } else {
        const previous = <DoubleLink<T>>link.previous, next = link.next
        previous.next = next
        next.previous = previous
        if (old.firstLink === link) {
          old.firstLink = next
        }
      }
    }
    link.status = this
    if (++this.memberCount === 1) {
      this.firstLink = link.previous = link.next = link
    } else {
      const firstLink = <DoubleLink<T>>this.firstLink, lastLink = <DoubleLink<T>>firstLink.previous
      link.previous = lastLink
      link.next = firstLink
      firstLink.previous = lastLink.next = link
    }
    return this
  }

  /**
   * Delete all members of this status.
   */
  public clear() {
    const firstLink = this.firstLink
    if (firstLink) {
      this.firstLink = null
      this.memberCount = 0
      let link: DoubleLink<T>, nextLink = firstLink
      do {
        link = nextLink
        nextLink = <DoubleLink<T>>link.next
        link.previous = link.next = null
      } while (nextLink !== firstLink)
    }
  }

  /**
   * Delete a member.
   * @param member Candidate member to delete
   * @returns True if candidate was deleted from this status, otherwise false
   */
  public delete(member: T) {
    const link = linkedMembers.get(member)
    if (link && link.next && link.status === this) {
      if (--this.memberCount === 0) {
        this.firstLink = link.previous = link.next = null
      } else {
        const nextLink: DoubleLink<T> = link.next, previousLink = <DoubleLink<T>>link.previous
        nextLink.previous = previousLink
        previousLink.next = nextLink
        link.previous = link.next = null
        if (this.firstLink === link) {
          this.firstLink = nextLink
        }
      }
      return true
    }
    return false
  }

  /**
   * Iterate over member pairs of this status.
   * @returns Iterator over arrays with two identical elements
   */
  public entries() {
    return map(this.values(), makeMemberEntry)
  }

  /**
   * Apply routine on all members of this status.
   * @param routine Closure is called with member and member key, which is identical to member
   * @param thisReceiver Optional receiver to bind in routine applications
   */
  public forEach(routine: (member: T, memberKey: T) => void, thisReceiver?: any) {
    const firstLink = this.firstLink
    if (firstLink) {
      let link = firstLink
      do {
        routine.call(thisReceiver, link.member, link.member, this)
        link = <DoubleLink<T>>link.next
      } while (link !== firstLink)
    }
  }

  /**
   * Test member presence.
   * @param member Candidate member to test
   * @returns True if candidate is a member of this status, otherwise false
   */
  public has(member: T) {
    const link = linkedMembers.get(member)
    return !!link && !!link.next && link.status === this
  }

  /**
   * Iterate over members of this status.
   */
  public values() {
    return this[Symbol.iterator]()
  }

}

/**
 * Release a member from its current status. A released member is not referenced by a status.
 * @param member Candidate member
 */
export function release(member: any) {
  const link = linkedMembers.get(member)
  if (link && link.next) {
    link.status.delete(member)
  }
}

// a link connects a member to the previous and next member in a status
class DoubleLink<T> {
  constructor(public status: ExclusiveSet<T>, public readonly member: T) {
  }
  public next: DoubleLink<T> | null
  public previous: DoubleLink<T> | null
}

// map members to their status link
const linkedMembers = new WeakMap<any, DoubleLink<any>>()

// create new status link
function createLink<T>(member: T, status: ExclusiveSet<T>) {
  const link = new DoubleLink(status, member)
  linkedMembers.set(member, link)
  return link
}

// utility to construct member pair for entries iterator
function makeMemberEntry<T>(member: T): [T, T] {
  return [member, member]
}
