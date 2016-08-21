/* @flow */

import FS from 'fs'
import Path from 'path'
import promisify from 'sb-promisify'
import type { ConfigGiven, Config, ConfigDirectoryTransferGiven, ConfigDirectoryTransfer } from './types'

export const stat = promisify(FS.stat)
const readFile = promisify(FS.readFile)
export const readdir = promisify(FS.readdir)

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

export function normalizePutDirectoryConfig(givenConfig: ConfigDirectoryTransferGiven): ConfigDirectoryTransfer {
  const config: Object = Object.assign({}, givenConfig)
  if (config.tick) {
    if (typeof config.tick !== 'function') {
      throw new Error('config.tick must be a function')
    }
  } else {
    config.tick = function() { }
  }
  if (config.validate) {
    if (typeof config.validate !== 'function') {
      throw new Error('config.validate must be a function')
    }
  } else {
    config.validate = function(path) {
      return Path.basename(path).substr(0, 1) !== '.'
    }
  }
  config.recursive = {}.hasOwnProperty.call(config, 'recursive') ? !!config.recursive : true
  return config
}

export async function scanDirectory(localPath: string, recursive: 0 | 1 | 2, validate: ((localPath: string) => boolean)): Promise<Array<string>> {
  const itemStat = await stat(localPath)
  if (itemStat.isFile()) {
    return [localPath]
  }
  if (!itemStat.isDirectory() || recursive === 0) {
    return []
  }
  const contents = await readdir(localPath)
  const results = await Promise.all(contents.map(function(item) {
    const itemPath = Path.join(localPath, item)
    if (validate(itemPath)) {
      return scanDirectory(itemPath, recursive === 1 ? 0 : 2, validate)
    }
    return []
  }))
  return results.reduce(function(toReturn, current) {
    return toReturn.concat(current)
  }, [])
}

export function exists(filePath: string): Promise<boolean> {
  return new Promise(function(resolve) {
    FS.access(filePath, FS.R_OK, function(error) {
      resolve(!error)
    })
  })
}

export function generateCallback(resolve: Function, reject: Function): Function {
  return function(error, result) {
    if (error) {
      reject(error)
    } else {
      resolve(result)
    }
  }
}
