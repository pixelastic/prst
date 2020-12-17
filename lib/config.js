const _ = require('golgoth/lodash');

module.exports = {
  config: {
    intervalDuration: 5 * 60, // interval between polls, in seconds
  },
  get(key) {
    return _.get(this.config, key);
  },
  set(key, value) {
    return _.set(this.config, key, value);
  },
};
