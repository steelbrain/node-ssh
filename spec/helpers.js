/* @flow */

import Path from 'path'

export const PUBLIC_KEY_PATH = Path.join(__dirname, 'fixtures', 'id_rsa.pub')
export const PRIVATE_KEY_PATH = Path.join(__dirname, 'fixtures', 'id_rsa')

export async function expectToThrow(callback: (() => Promise<void>), message: string) {
  try {
    await callback()
    throw new Error('Function did not throw an error')
  } catch (error) {
    expect(error.message).toBe(message)
  }
}
