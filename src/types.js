/* @flow */

export type Config = {
  // Minimal type of all the config options ssh2 accepts
  host: string,
  port: number,
  username: string,
  password: ?string,
  privateKey: ?string,
}

export type ConfigGiven = {
  host: string,
  port?: number,
  username: string,
  password?: string,
  privateKey?: string,
}
