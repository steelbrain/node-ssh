/* @flow */

export type Config = {
  // Minimal type of all the config options ssh2 accepts
  host: string,
  port: number,
  username: string,
  password: ?string,
  privateKey: ?string,
  onKeyboardInteractive: ?() => void,
}

export type ConfigGiven = {
  host: string,
  port?: number,
  username: string,
  password?: string,
  privateKey?: string,
  onKeyboardInteractive?: () => void | boolean,
}

export type PutFilesOptions = {
  sftp: ?Object,
  sftpOptions: Object,
  concurrency: number,
}
export type PutDirectoryOptions = {
  sftp: ?Object,
  sftpOptions: Object,
  concurrency: number,
  recursive: boolean,
  tick: (localPath: string, remotePath: string, error: ?Error) => void,
  validate: (localPath: string) => boolean,
}
