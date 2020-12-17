const chalk = require('golgoth/chalk');
const exit = require('firost/exit');
module.exports = {
  config: {
    success: {
      color: chalk.green,
      icon: '✔',
      exitCode: 0,
    },
    error: {
      color: chalk.red,
      icon: '✘',
      exitCode: 1,
    },
    failure: {
      color: chalk.red,
      icon: '⚠',
      exitCode: 1,
    },
    pending: {
      color: chalk.yellow,
      icon: '•',
      exitCode: 2,
    },
  },
  /**
   * Colors a text based on the state
   * @param {string} state Current state
   * @param {string} input Input text
   * @returns {string} Colored text
   **/
  colorize(state, input) {
    return this.config[state].color(input);
  },
  /**
   * Returns a matching icon based on the state
   * @param {string} state Current state
   * @returns {string} Colored icon
   **/
  icon(state) {
    return this.config[state].icon;
  },
  /**
   * Quit the app with different exit code based on the current status
   * @param {string} state Current state
   **/
  exit(state) {
    exit(this.config[state].exitCode);
  },
};
