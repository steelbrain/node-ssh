import fs from 'fs'
import path from 'path'

export const PUBLIC_KEY_PATH = path.join(__dirname, 'fixtures', 'id_rsa.pub')
export const PRIVATE_KEY_PATH = path.join(__dirname, 'fixtures', 'id_rsa')
export const PRIVATE_KEY_PPK_PATH = path.join(__dirname, 'fixtures', 'id_rsa.ppk')

export function wait(delay) {
  return new Promise(function(resolve) {
    setTimeout(resolve, delay)
  })
}

export function exists(filePath) {
  return new Promise(resolve => {
    fs.access(filePath, fs.constants.R_OK, err => {
      resolve(err === null)
    })
  })
}
