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

export type ConfigDirectoryTransfer = {
  recursive: boolean,
  tick: ((localPath: string, remotePath: string, error: ?Error) => void),
  validate: ((localPath: string) => boolean),
}

export type ConfigDirectoryTransferGiven = {
  recursive?: boolean,
  tick?: ((localPath: string, remotePath: string, error: ?Error) => void),
  validate?: ((localPath: string) => boolean),
}
