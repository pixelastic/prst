const gitHubHelper = require('./helpers/github');
const statusHelper = require('./helpers/status');
const exit = require('firost/exit');
const _ = require('golgoth/lib/lodash');
const minimist = require('minimist');
const clear = require('clear');
const config = require('./config.js');
const open = require('open');
const growl = require('growl');
const spinner = require('firost/spinner');
const pulse = require('firost/pulse');
const consoleError = require('firost/consoleError');

module.exports = {
  /**
   * Main commandline entry point
   * @param {object} rawArgs Raw CLI arguments
   **/
  async run(rawArgs) {
    await this.setup(rawArgs);

    if (config.get('args.once')) {
      await this.once();
      return;
    }

    await this.watch();
  },
  /**
   * Display status of the specified branch and exit
   **/
  async once() {
    try {
      const branchName = config.get('branchName');
      const status = await gitHubHelper.getStatus(branchName);
      pulse.emit('prst:success', 'Build status fetched');
      this.displayStatus(branchName, status);

      statusHelper.exit(status.state);
    } catch (err) {
      console.info(err);
      exit(1);
    }
  },
  /**
   * Regularly poll the branch status and display them
   **/
  async watch() {
    const intervalDuration = config.get('intervalDuration') * 1000;

    let firstFetch = true;

    const pollMethod = async () => {
      const branchName = config.get('branchName');
      const status = await gitHubHelper.getStatus(branchName);

      if (firstFetch) {
        pulse.emit('prst:success', 'Build status fetched');
        firstFetch = false;
      }
      clear();

      this.displayStatus(branchName, status);

      if (status.state !== 'pending') {
        const pr = await gitHubHelper.getPullRequestByBranchName(branchName);
        // Display notification
        growl(pr.title, { title: `Build ${status.state}` });

        // Open PR
        await open(pr.html_url);
        statusHelper.exit(status.state);
        return;
      }

      // Call it again
      setTimeout(pollMethod, intervalDuration);
    };

    await pollMethod();
  },
  /**
   * Display status of the branch as well as individual checks
   * @param {string} branchName Name of the branch
   * @param {object} status Status objec
   **/
  displayStatus(branchName, status) {
    const mainIcon = statusHelper.icon(status.state);
    const mainStatus = statusHelper.colorize(
      status.state,
      `Build ${status.state}`
    );
    console.info(`${mainIcon} [${branchName}] ${mainStatus}`);
    console.info('');

    _.each(status.details, (detail) => {
      const detailIcon = statusHelper.icon(detail.state);
      const context = `[${detail.context}]`;
      const description = statusHelper.colorize(
        detail.state,
        detail.description
      );
      console.info(`${detailIcon} ${context} ${description}`);
    });
  },
  /**
   * Pre-configure everything, fail early is error
   * @param {object} rawArgs Raw CLI arguments
   **/
  async setup(rawArgs) {
    // Fail early if no token
    if (!gitHubHelper.hasToken()) {
      consoleError('No GITHUB_TOKEN environment variable found');
      consoleError(
        'You can generate one on https://github.com/settings/tokens'
      );
      consoleError(
        "If your organization as enabled SSO for its repositories, you will need to click on 'Enable SSO'"
      );
      exit(1);
      return;
    }

    config.set('args', minimist(rawArgs));

    // Saving CLI arguments
    const userInterval = config.get('args.interval');
    if (userInterval) {
      config.set('intervalDuration', userInterval);
    }
    const branchHint = config.get('args.branch');
    if (branchHint) {
      config.set('branchHint', branchHint);
    }

    const progress = spinner();
    pulse.on('prst:progress', (progressStep) => {
      progress.tick(progressStep);
    });
    pulse.on('prst:success', (progressStep) => {
      progress.success(progressStep);
    });

    await gitHubHelper.fetch();
    const branchName = await gitHubHelper.getCurrentRemoteBranch();

    if (!branchName) {
      progress.failure('No remote branch found');
      consoleError(
        "Make sure you pushed your changes and the branch hasn't been deleted"
      );
      exit(1);
    }

    config.set('branchName', branchName);
  },
};
