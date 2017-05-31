import { Incident, Manager } from 'oma/theater'

import * as play from 'oma/theater/play'

const { director, spawn } = play

/**
 * A boss plays the role of a default manager.
 */
export abstract class Boss<M extends Manager> extends play.Role<M> {

  /**
   * Determine how a suicide attempt of a team member should be handled.
   * Default implementation punishes member, effectively burying the member.
   * @param incident Stage incident of suicide attempt
   */
  protected judgeSuicide(incident: Incident) {
    incident.punish()
  }

  /**
   * Repair damage that an incident of a team member has caused.
   * @param incident Stage incident
   * @param damage Stage error that captures damage
   * @returns Result of offending job
   */
  protected abstract repairDamage(incident: Incident, damage: Error): any

  public handleIncident(incident: Incident, damage?: Error) {
    return damage ? this.repairDamage(incident, damage) : this.judgeSuicide(incident)
  }
}

/**
 * A loose manager is forgiving. It ignores the damage of incidents.
 */
export class Loose<M extends Manager> extends Boss<M> {

  protected repairDamage(incident: Incident, damage: Error) {
    incident.ignore()
    return damage
  }

}

/**
 * The loose manager only punishes team members when they kill themselves. Other incidents are ignored.
 */
export const loose = spawn<Manager>(director, Loose)

/**
 * A strict manager is unforgiving. It kills team members on the spot.
 */
export class Strict<M extends Manager> extends Boss<M> {

  protected repairDamage(incident: Incident, damage: Error) {
    incident.punish()
    return damage
  }

}

/**
 * The strict manager kills all members that cause an incident.
 */
export const strict = spawn<Manager>(director, Strict)
