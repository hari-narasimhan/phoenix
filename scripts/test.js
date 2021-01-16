const minimist = require('minimist')
const rawArgs = process.argv.slice(2)
const args = minimist(rawArgs)

let regex

const jestArgs = [
  '--env', 'node',
  '--runInBand',
  ...rawArgs,
  ...(regex ? [regex] : [])
]

console.log(`running jest with args: ${jestArgs.join(' ')}`)

require('jest').run(jestArgs)