const current = require('../main.js');

describe('current', () => {
  it('should do something', async () => {
    const input = 'foo';

    const actual = current.run(input);

    expect(actual).toEqual(true);
  });
});
