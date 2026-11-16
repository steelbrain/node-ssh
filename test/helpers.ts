import fs from 'fs'
import path from 'path'

export const PUBLIC_KEY_PATH = path.join(__dirname, 'fixtures', 'id_rsa.pub')
export const PRIVATE_KEY_PATH = path.join(__dirname, 'fixtures', 'id_rsa')
export const PRIVATE_KEY_PPK_PATH = path.join(__dirname, 'fixtures', 'id_rsa.ppk')
// id_rsa.ppk encrypted with aes256-cbc, passphrase 'node-ssh test'
export const PRIVATE_KEY_ENCRYPTED_PPK_PATH = path.join(__dirname, 'fixtures', 'id_rsa_encrypted.ppk')

export function wait(delay: number): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(resolve, delay)
  })
}

export function exists(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    fs.access(filePath, fs.constants.R_OK, (err) => {
      resolve(err === null)
    })
  })
}
