/* @flow */

import FS from 'fs'
import Path from 'path'
import promisify from 'sb-promisify'
import type { ConfigGiven, Config, ConfigDirectoryTransferGiven, ConfigDirectoryTransfer } from './types'

export const stat = promisify(FS.stat)
const readFile = promisify(FS.readFile)
const readString = promisify(function(someString){
  return someString;
})
export const readdir = promisify(FS.readdir)

export async function normalizeConfig(givenConfig: ConfigGiven): Promise<Config> {
  const config: Object = Object.assign({}, givenConfig)
  if (config.username && typeof config.username !== 'string') {
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
    if (FS.existsSync(privateKey)) {
        config.privateKey = await readFile(privateKey, 'utf8')
    } else {
      config.privateKey = await readString(privateKey)
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
