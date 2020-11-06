const _ = require('golgoth/lib/lodash');

module.exports = {
  config: {
    interval: 5 * 60, // interval between polls, in seconds
  },
  get(key) {
    return _.get(this.config, key);
  },
  set(key, value) {
    return _.set(this.config, key, value);
  },
};
