import 'ssh2'

// The types from DefinitelyTyped are inaccurate.
declare module 'ssh2' {
  interface SFTPWrapper {
    end(): void
  }

  interface ClientChannel {
    close(): boolean
  }
}
