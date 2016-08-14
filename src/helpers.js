/* @flow */

import FS from 'fs'
import promisify from 'sb-promisify'
import type { ConfigGiven, Config } from './types'

const readFile = promisify(FS.readFile)

export async function normalizeConfig(givenConfig: ConfigGiven): Promise<Config> {
  const config: Object = Object.assign({}, givenConfig)
  if (typeof config.username !== 'string' || !config.username) {
    throw new Error('config.username must be a valid string')
  }
  if (typeof config.host !== 'string' || !config.host) {
    throw new Error('config.host must be a valid string')
  }
  if (config.privateKey) {
    const privateKey = config.privateKey
    if (typeof privateKey !== 'string') {
      throw new Error('config.privateKey must be a string')
    }
    if (!(privateKey.includes('BEGIN') && privateKey.includes('KEY'))) {
      try {
        config.privateKey = await readFile(privateKey)
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new Error(`config.privateKey doesn't exist at ${privateKey}`)
        }
        throw error
      }
    }
  } else if (config.password) {
    const password = config.password
    if (typeof password !== 'string') {
      throw new Error('config.password must be a string')
    }
    config.password = password
  }
  return config
}
