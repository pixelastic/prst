# prst

`prst` is a **P**ull **R**equest **S**tatus **T**racker. Run it in on your
branch and it will display live all the status checks of the relevant pull
request.

![prst in action](https://raw.githubusercontent.com/pixelastic/prst/master/.github/screenshot.png)

Once all the checks passed, it will notify you and open the Pull Request in your
browser.

## Installation

Install globally through yarn:

```javascript
yarn global add prst
```

You also need a `GITHUB_TOKEN` environment variable with a valid personal access
token. You can create one on [https://github.com/settings/tokens]().

_If your organization has SSO enabled, you'll need to sign your token by
clicking on the `Enable SSO` button_

## Usage

Simply run `prst` from your git repo and it will automatically look for a Pull
Request coming from your current branch and display the relevant status check.

It will check for status update regularly and once the build is over, will
notify you through your OS notification system and open the Pull Request in your
browser.

## Options

`prst` will look for a remote branch with the same name as the local branch by
default, but you can specify your own branch by pass the `--branch` argument.

By default the process will run until all the checks are completed, but you can
pass the `--once` flag to only run it once.

Status are polled every 5mn by default, but you can pass the `--interval` flag
to define your own custom interval delay (in seconds).
