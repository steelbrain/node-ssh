import path from 'path'

export const PUBLIC_KEY_PATH = path.join(__dirname, 'fixtures', 'id_rsa.pub')
export const PRIVATE_KEY_PATH = path.join(__dirname, 'fixtures', 'id_rsa')

export function wait(delay) {
  return new Promise(function(resolve) {
    setTimeout(resolve, delay)
  })
}
