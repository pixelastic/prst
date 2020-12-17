const { Octokit } = require('@octokit/rest');
const gitRemoteOriginUrl = require('git-remote-origin-url');
const parseGithubRepoUrl = require('parse-github-repo-url');
const envHelper = require('./env.js');
const _ = require('golgoth/lodash');
const consoleError = require('firost/consoleError');
const run = require('firost/run');
const config = require('../config.js');
const pulse = require('firost/pulse');

module.exports = {
  /**
   * Validate the branch name
   * @returns {string} Real branch name, or false if not found
   **/
  async getCurrentRemoteBranch() {
    const localBranchName =
      config.get('branchHint') || (await this.getCurrentLocalBranch());
    const remoteBranches = await this.getRemoteBranches();

    return _.find(remoteBranches, (remoteBranchName) => {
      return _.toLower(localBranchName) === _.toLower(remoteBranchName);
    });
  },
  /**
   * Returns the current local branch
   * @returns {string} Local branch name
   **/
  async getCurrentLocalBranch() {
    const { stdout: localBranch } = await run(
      'git rev-parse --abbrev-ref HEAD',
      { stdout: false, stderr: false }
    );
    return _.trim(localBranch);
  },

  /**
   * Returns the list of all remote branches
   * @returns {Array} List of all remote branches
   **/
  async getRemoteBranches() {
    pulse.emit('prst:progress', 'Listing remote branches');
    const { stdout: branches } = await run('git branch --remote', {
      stdout: false,
    });
    return _.chain(branches)
      .split('\n')
      .map((branch) => {
        return _.chain(branch).trim().replace('origin/', '').value();
      })
      .value();
  },
  /**
   * Returns the status of a given branch
   * @param {string} branchName Name of the branch to check
   * @returns {object} Object containing details of the status.
   */
  async getStatus(branchName) {
    pulse.emit('prst:progress', 'Getting branch status');
    const response = await this.call('repos.getCombinedStatusForRef', {
      ref: branchName,
    });

    const state = response.state;
    const details = _.map(response.statuses, (status) => {
      return _.pick(status, ['state', 'context', 'description', 'target_url']);
    });
    return { state, details };
  },
  /**
   * Return the Pull Request originating from the specified branch
   * @param {string} branchName Origin branch
   * @returns {object} Pull Request object
   **/
  async getPullRequestByBranchName(branchName) {
    const branchDetails = await this.call('repos.getBranch', {
      branch: branchName,
    });
    const branchSha = _.get(branchDetails, 'commit.sha');

    const searchResult = await this.call('search.issuesAndPullRequests', {
      q: `is:pr ${branchSha}`,
    });
    const pr = searchResult.items[0];

    return _.pick(pr, ['html_url', 'title']);
  },
  /**
   * Returns the GitHub token
   * @returns {string} GitHub Token
   **/
  token() {
    return envHelper.get('GITHUB_TOKEN');
  },
  /**
   * Check if a GitHub token is configured
   * @returns {boolean} True if a token is found **/
  hasToken() {
    return !!this.token();
  },
  /**
   * Call an Octokit method
   * @param {string} methodName Name of the method to call
   * @param {object} options Options to pass to the method
   * @returns {object} Data response from the call
   **/
  async call(methodName, options = {}) {
    if (!this.__octokit) {
      const githubToken = envHelper.get('GITHUB_TOKEN');
      this.__octokit = new Octokit({ auth: githubToken });
    }

    const method = _.get(this.__octokit, methodName);
    try {
      const { user: owner, repo } = await this.repoData();
      const response = await method({
        owner,
        repo,
        ...options,
      });
      return response.data;
    } catch (err) {
      this.displayError(err);
    }
  },
  displayError(error) {
    console.info('');
    consoleError('An error occurred while contacting GitHub');
    consoleError(error.toString());

    const errorLink = error.documentation_url;
    if (errorLink) {
      consoleError(`Please check ${errorLink} to fix the issue`);
    }
    // Display the full error when --debug is passed
    if (config.args.debug) {
      console.info(error);
    }
  },
  __octokit: null,
  /**
   * Returns repository information
   * @returns {object} Information object with the following keys
   *  - {string} .user GitHub username
   *  - {string} .repo GitHub reponame
   *  - {string} .branch Current branch
   **/
  async repoData() {
    if (!this.__repoData) {
      const originUrl = await gitRemoteOriginUrl();
      const [user, repo] = parseGithubRepoUrl(originUrl);
      this.__repoData = { user, repo };
    }
    return this.__repoData;
  },
  async fetch() {
    pulse.emit('prst:progress', 'Fetching remote information');
    await run('git fetch', { stdout: false, stderr: false });
  },
  __repoData: null,
};
