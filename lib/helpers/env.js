const _ = require('golgoth/lodash');
module.exports = {
  /**
   * Return an ENV var value
   * @param {string} key ENV var key
   * @returns {string} ENV var value
   **/
  get(key) {
    return _.get(process, `env.${key}`);
  },
};
