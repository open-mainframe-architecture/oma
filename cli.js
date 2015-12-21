"use strict";

var path = require('path');

var yargs = require('yargs');

var util = require('./util');

module.exports = function (alternativeCommandLine) {
  var commands = util.setup.cli;
  var main = path.basename(require.main.filename);
  var mainArgs = yargs.strict().help('help').version(util.version)
    .usage('Usage: ' + main + ' <command> [options]')
    .epilogue('Supply <command> for more help')
    ;
  // promise to execute command
  return new Promise(function (resolve) {
    var seenCommand = false;
    for (var key in commands) {
      mainArgs.command(key, commands[key].short, prepareCommand.bind(null, key));
    }
    var argv = alternativeCommandLine ? mainArgs.parse(alternativeCommandLine) : mainArgs.argv;
    var command = argv._[0];
    if (!seenCommand) {
      throw error(command && 'Unknown command: ' + command);
    }
    // pass options to command module in command/ subdirectory
    resolve(require('./command/' + command)(commandOptions(commands[command], argv)));
    function error(msg) {
      mainArgs.showHelp();
      if (msg) {
        console.error(msg);
      }
      resolve();
    }
    function prepareCommand(commandKey, nestedArgs) {
      seenCommand = true;
      var yopts = {}, nargs = {};
      var commandSpec = commands[commandKey];
      var least = typeof commandSpec.least === 'number' ? commandSpec.least : 0;
      var most = typeof commandSpec.most === 'number' ? commandSpec.most : -1;
      for (var alias in commandSpec.option) {
        var optionSpec = commandSpec.option[alias];
        if (yopts[optionSpec.letter]) {
          throw error('Duplicate letter ' + optionSpec.letter + ' in command configuration');
        }
        nargs[optionSpec.letter] = optionSpec.arity === 0 ? 0 : optionSpec.arity || 1;
        yopts[optionSpec.letter] = {
          alias: alias,
          demand: optionSpec.demand,
          describe: optionSpec.describe,
          type: optionSpec.arity === 0 ? 'boolean' : 'string'
        };
      }
      nestedArgs.strict().help('help').nargs(nargs).options(yopts)
        .usage('Usage: ' + main + ' ' + commandKey + ' ' + commandSpec.usage)
      ;
      if (least > 0 || most >= least) {
        nestedArgs.demand(least + 1, most >= least ? most + 1 : void 0);
      }
      for (var key in commandSpec.example) {
        nestedArgs.example(main + ' ' + commandKey + ' ' + key, commandSpec.example[key]);
      }
      if (commandSpec.long) {
        nestedArgs.epilogue(commandSpec.long);
      }
    }
    function commandOptions(commandSpec, yargv) {
      var opts = { '': yargv._.slice(1) };
      for (var key in yargv) {
        var optionSpec = commandSpec.option[key];
        if (optionSpec) {
          if (optionSpec.arity === 0) {
            opts[key] = yargv[key];
          } else {
            var values = Array.isArray(yargv[key]) ? yargv[key] : [yargv[key]];
            var arity = optionSpec.arity || 1;
            if (optionSpec.once && values.length > arity) {
              throw error('Too many options: ' + key);
            }
            opts[key] = optionSpec.once && arity === 1 ? values[0] : values;
          }
        }
      }
      return opts;
    }
  });
};
