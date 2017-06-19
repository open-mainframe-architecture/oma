/**
 * They're called constants for a reason... Do not change!
 */
export default {

  /**
   * Special subresource to add a new navigator.
   */
  addNavigator: 'navigate',

  /**
   * Name of JavaScript file with bundled modules.
   */
  bundleFilename: 'bundle.js',

  /**
   * Duration in seconds to persist files in browser cache.
   */
  cacheMaxAge: 365 * 24 * 60 * 60,

  /**
   * Cookie names for web services.
   */
  cookieName: {
    device: 'oma-device',
    guest: 'oma-guest',
    ticket: 'oma-ticket'
  },

  /**
   * Name of mandatory foundation bundle.
   */
  foundationName: 'oma-foundation',

  /**
   * Id of HTML element that holds all rendered terminals and navigates between them.
   */
  navigatorElement: 'navigator',

  /**
   * Key in session storage where navigator info is stored.
   */
  navigatorKey: 'oma.navigator',

  /**
   * Name of mandatory navigator bundle.
   */
  navigatorName: 'oma-navigator',

  /**
   * Id of HTML element that links to reset style sheet.
   */
  resetElement: 'reset',
  
  /**
   * Relative URL of special directory where services reside.
   * These URLs are not handled by the welcome service.
   */
  serviceHome: '_',

  /**
   * Special subdirectory where library publishes bundles.
   */
  staticFiles: 'pub',

  /**
   * Id of HTML element in terminal iframe where user interface is rendered.
   */
  terminalElement: 'terminal'

}