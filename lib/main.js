const gitHubHelper = require('./helpers/github');
const exit = require('firost/exit');
const chalk = require('golgoth/lib/chalk');
const _ = require('golgoth/lib/lodash');
const minimist = require('minimist');
const clear = require('clear');
const config = require('./config.js');
const open = require('open');
const growl = require('growl');
const spinner = require('firost/spinner');
const consoleError = require('firost/consoleError');

module.exports = {
  /**
   * Main commandline entry point
   * @param {object} rawArgs Raw CLI arguments
   **/
  async run(rawArgs) {
    config.args = minimist(rawArgs);

    this.sanityCheck();

    // Stop early if no such branch found
    const userBranchName = config.args._[0];
    const branchName = await gitHubHelper.getBranchName(userBranchName);
    if (!branchName) {
      consoleError(`No branch ${userBranchName} found`);
      consoleError("Make sure it hasn't been deleted");
      exit(1);
    }

    if (config.args.watch) {
      await this.watch(branchName);
      return;
    }

    await this.runOnce(branchName);
  },
  /**
   * Display status of the specified branch and exit
   * @param {string} branchName Name of the branch
   **/
  async runOnce(branchName) {
    const progress = spinner();
    progress.tick(`Fetching ${branchName} data`);
    try {
      const status = await gitHubHelper.getStatus(branchName);
      progress.success('Data fetched');
      this.displayStatus(branchName, status);

      this.exit(status.state);
    } catch (err) {
      console.info(err);
      this.exit(1);
    }
  },
  /**
   * Regularly poll the branch status and display them
   * @param {string} branchName Name of the branch
   **/
  async watch(branchName) {
    const intervalDelay = (config.args.interval || 5 * 60) * 1000;

    const progress = spinner();
    progress.tick(`Fetching ${branchName} data`);
    let firstFetch = true;

    const intervalMethod = async () => {
      const status = await gitHubHelper.getStatus(branchName);

      if (firstFetch) {
        progress.success('');
        firstFetch = false;
      }
      clear();

      this.displayStatus(branchName, status);

      if (status.state !== 'pending') {
        await stopWatching(status);
      }
    };

    const stopWatching = async (status) => {
      if (interval) {
        clearInterval(interval);
      }

      const pr = await gitHubHelper.getPullRequestByBranchName(branchName);

      // Display notification
      growl(pr.title, { title: `Build ${status.state}` });

      // Open PR
      await open(pr.html_url);

      this.exit(status.state);
    };

    let interval;
    await intervalMethod();
    interval = setInterval(intervalMethod, intervalDelay);
  },
  /**
   * Display status of the branch as well as individual checks
   * @param {string} branchName Name of the branch
   * @param {object} status Status objec
   **/
  displayStatus(branchName, status) {
    const mainIcon = this.icon(status.state);
    const mainStatus = this.colorize(`Build ${status.state}`, status.state);
    console.info(`${mainIcon} [${branchName}] ${mainStatus}`);
    console.info('');

    _.each(status.details, (detail) => {
      const detailIcon = this.icon(detail.state);
      const context = `[${detail.context}]`;
      const description = this.colorize(detail.description, detail.state);
      console.info(`${detailIcon} ${context} ${description}`);
    });
  },
  /**
   * Stop early if configuration is incorrect
   **/
  sanityCheck() {
    if (gitHubHelper.hasToken()) {
      return;
    }
    consoleError('No GITHUB_TOKEN environment variable found');
    consoleError('You can generate one on https://github.com/settings/tokens');
    consoleError(
      "If your organization as enabled SSO for its repositories, you will need to click on 'Enable SSO'"
    );
    exit(1);
  },
  /**
   * Colors a text based on the state
   * @param {string} input Input text
   * @param {string} state Current state
   * @returns {string} Colored text
   **/
  colorize(input, state) {
    const colorHash = {
      success: chalk.green,
      error: chalk.red,
      failure: chalk.red,
      pending: chalk.yellow,
    };
    return colorHash[state](input);
  },
  /**
   * Returns a matching icon based on the state
   * @param {string} state Current state
   * @returns {string} Colored icon
   **/
  icon(state) {
    const iconHash = {
      success: '✔',
      error: '✘',
      failure: '⚠',
      pending: '•',
    };
    return this.colorize(iconHash[state], state);
  },
  /**
   * Quit the app with different exit code based on the current status
   * @param {string} state Current state
   **/
  exit(state) {
    const statusHash = {
      success: 0,
      error: 1,
      failure: 1,
      pending: 2,
    };
    exit(statusHash[state]);
  },
};
