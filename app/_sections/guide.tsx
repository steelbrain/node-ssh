import { Code } from '@/components/code'
import { CodeTabs } from '@/components/code-tabs'
import { H3, Issue, Options, REPO_URL, Section } from '@/components/docs'
import * as snippets from '@/lib/snippets'

export function Connect() {
  return (
    <Section id="connect" title="Connect">
      <div className="prose">
        <p>
          <code>connect(config)</code> opens the connection and resolves with the <code>NodeSSH</code> instance once the
          server accepts the login. <code>config</code> is ssh2’s <code>ConnectConfig</code>, so options such as{' '}
          <code>port</code>, <code>passphrase</code>, <code>agent</code>, <code>readyTimeout</code> and{' '}
          <code>keepaliveInterval</code> go straight to ssh2. It needs a <code>username</code>, and a <code>host</code> or an
          existing <code>sock</code>.
        </p>
      </div>
      <CodeTabs
        id="connect-code"
        label="Ways to log in"
        tabs={[
          { label: 'Key file', code: snippets.CONNECT_KEY_FILE },
          { label: 'Key', code: snippets.CONNECT_KEY },
          { label: 'Password', code: snippets.CONNECT_PASSWORD },
          { label: 'CommonJS', code: snippets.CONNECT_COMMONJS },
        ]}
      />
      <p className="prose">node-ssh adds these options to ssh2’s:</p>
      <Options
        label="Connection options"
        items={[
          {
            name: 'privateKeyPath',
            type: 'string',
            children: (
              <>
                Path of a private key file on this machine. node-ssh reads it before connecting. Don’t combine it with{' '}
                <code>privateKey</code>.
              </>
            ),
          },
          {
            name: 'privateKey',
            type: 'string | Buffer',
            children: (
              <>
                The key itself. Since 13.0.0 it no longer accepts a file path; since 14.0.0 it also accepts a{' '}
                <code>Buffer</code>.
              </>
            ),
          },
          {
            name: 'password',
            type: 'string',
            children: <>Log in with a password.</>,
          },
          {
            name: 'tryKeyboard',
            type: 'boolean',
            children: (
              <>
                Also try keyboard-interactive authentication. With a <code>password</code> and no{' '}
                <code>onKeyboardInteractive</code>, node-ssh answers a prompt that contains “password” with the password.
                Servers that only accept keyboard-interactive logins otherwise fail with{' '}
                <code>All configured authentication methods failed</code>.
              </>
            ),
          },
          {
            name: 'onKeyboardInteractive',
            type: '(name, instructions, lang, prompts, finish) => void',
            children: (
              <>
                Answer keyboard-interactive prompts yourself, by calling <code>finish</code> with one response per prompt.
                Used with <code>tryKeyboard: true</code>.
              </>
            ),
          },
        ]}
      />
      <Code code={snippets.KEYBOARD_INTERACTIVE} />
      <div className="prose">
        <p>
          <code>onKeyboardInteractive</code> is called only when the server offers keyboard-interactive authentication.
          OpenSSH offers it when <code>KbdInteractiveAuthentication</code> is <code>yes</code> in <code>sshd_config</code>;
          Debian and Ubuntu set it to <code>no</code>, and their servers still accept a <code>password</code>.
        </p>
        <p>
          To log in another way after the server refuses one, check the error’s <code>level</code> and connect again, or pass
          ssh2’s <code>authHandler</code> option, which node-ssh passes on.
        </p>
      </div>
      <Code code={snippets.CONNECT_RETRY} />
      <p className="prose">
        <code>isConnected()</code> is <code>true</code> once the connection is ready, until it ends or closes.
      </p>
    </Section>
  )
}

export function Commands() {
  return (
    <Section id="commands" title="Run commands">
      <div className="prose">
        <p>
          <code>execCommand(command, options)</code> runs a command in the remote user’s shell and resolves with{' '}
          <code>stdout</code>, <code>stderr</code>, <code>code</code> and <code>signal</code> when it exits. It resolves
          whatever the exit code, so check <code>code</code>. Output is trimmed unless you pass <code>noTrim: true</code>.
        </p>
        <p>
          <code>exec(command, parameters, options)</code> escapes each parameter with shell-escape and appends it to the
          command. It resolves with <code>stdout</code>, and rejects with an error holding <code>stderr</code> if the command
          wrote anything to it, even with exit code 0. With <code>stream: &apos;stderr&apos;</code> it resolves with{' '}
          <code>stderr</code>, and with <code>stream: &apos;both&apos;</code> with the same object as{' '}
          <code>execCommand</code>.
        </p>
      </div>
      <Code code={snippets.COMMANDS} />
      <Code code={snippets.EXEC_STREAMS} />

      <H3 id="command-options">Options</H3>
      <Options
        label="Command options"
        items={[
          {
            name: 'cwd',
            type: 'string',
            children: (
              <>
                Directory to run the command in. A leading <code>~</code> is the remote user’s home directory. If the
                directory doesn’t exist, the command doesn’t run, and the result has the shell’s error in <code>stderr</code>{' '}
                and a non-zero <code>code</code>.
              </>
            ),
          },
          {
            name: 'stdin',
            type: 'string | Readable',
            children: (
              <>
                Written to the command’s standard input, which is then closed. Without <code>stdin</code>, it is closed right
                away.
              </>
            ),
          },
          {
            name: 'onStdout, onStderr',
            type: '(chunk: Buffer) => void',
            children: (
              <>
                Called with each chunk as it arrives. If one throws, node-ssh closes the command’s channel and rejects with
                the error.
              </>
            ),
          },
          {
            name: 'onChannel',
            type: '(channel: ClientChannel) => void',
            children: <>Called with ssh2’s channel once the server has started the command.</>,
          },
          {
            name: 'execOptions',
            type: 'ExecOptions',
            children: (
              <>
                Passed to ssh2’s <code>exec</code>, for example <code>{'{ pty: true }'}</code> or <code>env</code>.
              </>
            ),
          },
          {
            name: 'encoding',
            type: 'BufferEncoding',
            default: "'utf8'",
            children: (
              <>
                How <code>stdout</code> and <code>stderr</code> are decoded.
              </>
            ),
          },
          {
            name: 'noTrim',
            type: 'boolean',
            default: 'false',
            children: <>Keep leading and trailing whitespace, for example when reading a file’s exact contents.</>,
          },
          {
            name: 'noBuffer',
            type: 'boolean',
            default: 'false',
            children: (
              <>
                Don’t collect output: it only goes to <code>onStdout</code> and <code>onStderr</code>, and the result’s{' '}
                <code>stdout</code> and <code>stderr</code> are empty. With <code>exec</code>, output on stderr then no
                longer rejects.
              </>
            ),
          },
          {
            name: 'timeout',
            type: 'number',
            children: (
              <>
                Milliseconds, counted from the call, after which node-ssh stops the command and rejects. See{' '}
                <a href="#timeouts">timeouts</a>.
              </>
            ),
          },
          {
            name: 'signal',
            type: 'AbortSignal',
            children: <>Stops the command and rejects with the signal’s reason when it aborts.</>,
          },
          {
            name: 'killSignal',
            type: 'string',
            default: "'TERM'",
            children: (
              <>
                What <code>timeout</code> and <code>signal</code> ask the server to send: <code>ABRT</code>,{' '}
                <code>ALRM</code>, <code>FPE</code>, <code>HUP</code>, <code>ILL</code>, <code>INT</code>, <code>KILL</code>,{' '}
                <code>PIPE</code>, <code>QUIT</code>, <code>SEGV</code>, <code>TERM</code>, <code>USR1</code> or{' '}
                <code>USR2</code>, with or without the <code>SIG</code> prefix.
              </>
            ),
          },
          {
            name: 'stream',
            type: "'stdout' | 'stderr' | 'both'",
            default: "'stdout'",
            children: (
              <>
                <code>exec</code> only: what it resolves with.
              </>
            ),
          },
        ]}
      />

      <H3 id="pty">Prompts and pseudo-terminals</H3>
      <div className="prose">
        <p>
          A program that asks questions reads the answers from its stdin. If it reads them without a terminal, pass all of
          them as <code>stdin</code>:
        </p>
      </div>
      <Code code={snippets.PROMPTS_STDIN} />
      <div className="prose">
        <p>
          Some programs need a terminal: <code>screen</code> and <code>tmux</code>, and programs that only prompt on one.
          Without a terminal, a program may not print its prompts (bash’s <code>read -p</code> doesn’t) or may not ask at
          all; <code>git clone</code> of an HTTPS repository that needs a login fails with{' '}
          <code>fatal: could not read Username</code>. For those, pass <code>pty: true</code> through{' '}
          <code>execOptions</code> and write each answer once its prompt appears:
        </p>
      </div>
      <Code code={snippets.PROMPTS_PTY} />
      <div className="prose">
        <ul>
          <li>
            The terminal is the program’s only output, so everything it writes arrives in <code>stdout</code> and{' '}
            <code>stderr</code> stays empty. Lines end in <code>\r\n</code>.
          </li>
          <li>
            The terminal echoes what you write into <code>stdout</code> until the program turns echo off, so a password
            written before its prompt shows up in <code>stdout</code>.
          </li>
          <li>
            The end of <code>stdin</code> doesn’t end the program, so an interactive shell started this way keeps running
            until it gets <code>exit</code>.
          </li>
        </ul>
        <p>
          To run a full-screen program such as <code>vim</code> from a script, connected to your own terminal, see{' '}
          <a href={`${REPO_URL}#interactive-programs`}>Interactive programs</a> in the README.
        </p>
        <p>
          OpenSSH runs the user’s login shell, from <code>/etc/passwd</code> on most systems, for every command and for{' '}
          <code>requestShell</code>; a <code>SHELL</code> variable in <code>env</code> doesn’t change that. To use another
          shell, run it as the command, such as <code>&apos;ksh -l&apos;</code>, and pass its commands as <code>stdin</code>.
          It exits at the end of its stdin.
        </p>
      </div>

      <H3 id="timeouts">Timeouts and stopping commands</H3>
      <div className="prose">
        <p>
          When <code>timeout</code> passes, node-ssh asks the server to send <code>killSignal</code> to the command, closes
          the command’s channel and rejects with an <code>SSHError</code> whose <code>code</code> is <code>ETIMEDOUT</code>.
        </p>
      </div>
      <Code code={snippets.TIMEOUT} />
      <div className="prose">
        <p>
          To stop a command yourself, pass an <code>AbortSignal</code> as <code>signal</code>. Aborting it does the same as
          the timeout, and the promise rejects with <code>signal.reason</code>. If the signal has already aborted, the
          promise rejects right away and the command doesn’t run.
        </p>
      </div>
      <Code code={snippets.ABORT} />
      <div className="prose">
        <p>
          The promise rejects as soon as the timeout passes or the signal aborts, without waiting for the command to exit.
          What happens to the command depends on the server:
        </p>
        <ul>
          <li>
            OpenSSH (tested with 9.2) sends the signal to the command’s process group, so programs the command started get it
            too. A command can catch or ignore the signal and keep running; <code>KILL</code> can’t be ignored.
          </li>
          <li>
            Without a pseudo-terminal, closing the channel doesn’t stop the command on OpenSSH. With{' '}
            <code>execOptions: {'{ pty: true }'}</code>, OpenSSH also hangs up the terminal when the channel closes, which
            sends <code>SIGHUP</code>.
          </li>
          <li>
            OpenSSH refuses signal requests for forced commands (<code>command=</code> in <code>authorized_keys</code>), and
            other servers may ignore them. Without a pseudo-terminal, the command then keeps running.
          </li>
        </ul>
        <p>
          ssh2’s own <code>channel.signal()</code>, on the channel from <code>onChannel</code>, sends nothing once the
          channel’s stdin has ended, which <code>execCommand</code> does right away when <code>stdin</code> is a string or
          not given. <code>timeout</code> and <code>signal</code> send the request in that case too. <Issue number={422} />
        </p>
      </div>

      <H3 id="large-output">Large output</H3>
      <div className="prose">
        <p>
          <code>execCommand</code> keeps all output in memory and returns it as strings. If it’s too large for a string, the
          promise rejects with an <code>SSHError</code> whose code is <code>ERR_OUTPUT_TOO_LARGE</code>. With{' '}
          <code>noBuffer: true</code>, output only goes to your callbacks:
        </p>
      </div>
      <Code code={snippets.LARGE_OUTPUT} />
    </Section>
  )
}

export function Files() {
  return (
    <Section id="files" title="Transfer files">
      <div className="prose">
        <p>
          File transfers use SFTP. Each method opens an SFTP session and closes it when done, unless you pass one in. The
          local path comes first, then the remote path, for uploads and downloads alike.
        </p>
      </div>
      <Code code={snippets.FILES} />
      <div className="prose">
        <ul>
          <li>
            Both paths name the file itself: to upload into a directory, put the file name at the end of the remote path.{' '}
            <code>putFile</code> creates missing remote directories.
          </li>
          <li>
            <code>putFiles</code> uploads <code>concurrency</code> files at a time (1 unless set) and rejects on the first
            failure. The error’s <code>transferred</code> property lists the files uploaded before it.
          </li>
          <li>
            <code>transferOptions</code> go to ssh2’s <code>fastPut</code> and <code>fastGet</code>: <code>concurrency</code>
            , <code>chunkSize</code>, <code>step</code> (progress) and <code>mode</code>.
          </li>
        </ul>
      </div>

      <H3 id="directories">Directories</H3>
      <div className="prose">
        <p>
          <code>putDirectory(local, remote, options)</code> and <code>getDirectory(local, remote, options)</code> create the
          directories first, then transfer the files, <code>concurrency</code> at a time. A file that fails doesn’t reject
          the call: <code>tick</code> gets its error, and the call resolves with <code>false</code> instead of{' '}
          <code>true</code>. For <code>getDirectory</code>, the local directory must exist.
        </p>
      </div>
      <Code code={snippets.DIRECTORY} />
      <Options
        label="Directory options"
        items={[
          {
            name: 'recursive',
            type: 'boolean',
            default: 'true',
            children: <>Include subdirectories.</>,
          },
          {
            name: 'concurrency',
            type: 'number',
            default: '1',
            children: (
              <>Transfers at a time. Not every server handles many at once; 1 has worked with the widest range of servers.</>
            ),
          },
          {
            name: 'validate',
            type: '(path: string) => boolean',
            children: (
              <>
                Called with the path of each file and directory, local for <code>putDirectory</code> and remote for{' '}
                <code>getDirectory</code>; return <code>false</code> to leave it out, with everything inside it. The default
                leaves out names that start with a dot.
              </>
            ),
          },
          {
            name: 'tick',
            type: '(localFile, remoteFile, error, skipped) => void',
            children: (
              <>
                Called after each file, with the error or <code>null</code>. <code>putDirectory</code> also passes{' '}
                <code>skipped</code>.
              </>
            ),
          },
          {
            name: 'atomic, skipUnchanged',
            type: 'boolean',
            default: 'false',
            children: (
              <>
                <code>putDirectory</code> only. See below.
              </>
            ),
          },
          {
            name: 'sftp, transferOptions',
            type: 'SFTPWrapper, TransferOptions',
            children: <>An SFTP session to use, and the options for each file.</>,
          },
        ]}
      />

      <H3 id="atomic">Atomic uploads</H3>
      <div className="prose">
        <p>
          While a file uploads, its remote path holds an incomplete file, and a web server reading that path could serve part
          of it. With <code>atomic: true</code>, <code>putFile</code>, <code>putFiles</code> and <code>putDirectory</code>{' '}
          upload each file to a hidden temporary file in the same remote directory (<code>.name.&lt;random hex&gt;.tmp</code>
          ) and rename it to the remote path once the upload is complete.
        </p>
      </div>
      <Code code={snippets.ATOMIC} />
      <div className="prose">
        <p>
          When the server supports the <code>posix-rename@openssh.com</code> extension, as OpenSSH does, the rename replaces
          an existing file in one step. Otherwise node-ssh uses a plain SFTP rename, and if that fails, deletes the existing
          file and renames again; the remote path is missing for a moment, so this fallback is not atomic.
        </p>
        <p>
          The renamed file is a new file, so it doesn’t keep the mode or owner of the file it replaces; pass{' '}
          <code>transferOptions: {'{ mode }'}</code> to set its mode. Creating the temporary file needs write permission on
          the remote directory, not only on the file. If the upload or the rename fails, node-ssh deletes the temporary file
          before rejecting. If the connection drops, the temporary file can stay behind.
        </p>
      </div>

      <H3 id="skip-unchanged">Skipping unchanged files</H3>
      <div className="prose">
        <p>
          With <code>skipUnchanged: true</code>, <code>putFile</code>, <code>putFiles</code> and <code>putDirectory</code>{' '}
          look up each remote path first and skip the upload when it is a regular file with the same size and modification
          time as the local file. After an upload, they set the remote file’s access and modification times to the local
          file’s, so the next upload can skip it. The server’s clock doesn’t matter.
        </p>
      </div>
      <Code code={snippets.SKIP_UNCHANGED} />
      <div className="prose">
        <ul>
          <li>
            SFTP sends times in whole seconds, so the local modification time is rounded down to a second. A file uploaded
            without <code>skipUnchanged</code> has the time of that upload, so the first upload with it uploads the file
            again.
          </li>
          <li>
            The check doesn’t read file contents: a file that changed but kept its size and modification time is skipped. A
            skipped file keeps its remote mode and owner.
          </li>
          <li>
            If the server can’t set the times, for example on a file owned by another user, the upload rejects. Without{' '}
            <code>atomic</code>, the remote file already has the new contents then.
          </li>
        </ul>
      </div>

      <H3 id="reuse-sftp">Reusing an SFTP session</H3>
      <div className="prose">
        <p>
          The file methods take an SFTP session as a parameter (<code>putFile</code>, <code>getFile</code>,{' '}
          <code>mkdir</code>) or as the <code>sftp</code> option. <code>withSFTP</code> opens one and ends it when the
          callback settles.
        </p>
      </div>
      <Code code={snippets.REUSE_SFTP} />

      <H3 id="mkdir">Creating directories</H3>
      <div className="prose">
        <p>
          <code>mkdir(path)</code> creates a remote directory and its missing parents over SFTP; with{' '}
          <code>mkdir(path, &apos;exec&apos;)</code> it runs <code>mkdir -p</code> instead. A directory that already exists
          is fine; a file at that path rejects.
        </p>
      </div>
      <Code code={snippets.MKDIR} />
    </Section>
  )
}

export function Sessions() {
  return (
    <Section id="sessions" title="Shells and SFTP sessions">
      <div className="prose">
        <p>
          <code>requestShell(options)</code> resolves with ssh2’s channel for an interactive shell. <code>options</code> go
          to ssh2’s <code>shell()</code>: pseudo-terminal settings such as <code>rows</code>, <code>cols</code> and{' '}
          <code>term</code>, or <code>false</code> for no pseudo-terminal. <code>withShell(callback, options)</code> passes
          the channel to <code>callback</code> and destroys it when the callback settles.
        </p>
      </div>
      <Code code={snippets.SHELL} />
      <div className="prose">
        <p>
          <code>requestSFTP()</code> resolves with ssh2’s <code>SFTPWrapper</code>, whose methods take callbacks;{' '}
          <code>withSFTP(callback)</code> ends the session when the callback settles.
        </p>
      </div>
      <Code code={snippets.SFTP} />
    </Section>
  )
}

export function Forwarding() {
  return (
    <Section id="forwarding" title="Port forwarding">
      <div className="prose">
        <p>
          <code>forwardOut(srcIP, srcPort, dstIP, dstPort)</code> resolves with a channel to <code>dstIP:dstPort</code> as
          seen from the server, like <code>ssh -L</code>. <code>srcIP</code> and <code>srcPort</code> tell the server where
          the connection comes from.
        </p>
      </div>
      <Code code={snippets.FORWARD_OUT} />
      <div className="prose">
        <p>
          <code>forwardIn(remoteAddr, remotePort, onConnection)</code> asks the server to listen on{' '}
          <code>remoteAddr:remotePort</code> and calls <code>onConnection</code> for each connection, like{' '}
          <code>ssh -R</code>. Pass port 0 to let the server pick one. It resolves with the <code>port</code> and{' '}
          <code>dispose()</code>, which stops listening.
        </p>
      </div>
      <Code code={snippets.FORWARD_IN} />
      <div className="prose">
        <p>
          <code>forwardOutStreamLocal(socketPath)</code> and <code>forwardInStreamLocal(socketPath, onConnection)</code> do
          the same for Unix domain sockets on the server, using an OpenSSH extension.
        </p>
      </div>
    </Section>
  )
}

export function Errors() {
  return (
    <Section id="errors" title="Errors and disconnecting">
      <div className="prose">
        <ul>
          <li>
            Invalid arguments throw an <code>AssertionError</code> from <code>node:assert</code> whose message names the
            argument, such as <code>config.username must be a valid string</code>.
          </li>
          <li>
            Methods that need the connection throw <code>Not connected to server</code> before <code>connect()</code> and
            after the connection has ended.
          </li>
          <li>
            node-ssh’s own errors are instances of <code>SSHError</code>, with a <code>code</code>: <code>ETIMEDOUT</code>{' '}
            when a command’s <code>timeout</code> passes or when the connection closes before the login completes (with the
            message <code>No response from server</code>), and <code>ERR_OUTPUT_TOO_LARGE</code> for output too large to
            return as a string.
          </li>
          <li>Other errors come from ssh2 and the server.</li>
        </ul>
      </div>
      <Code code={snippets.ERRORS} />
      <div className="prose">
        <p>
          An error on an idle connection, such as <code>ECONNRESET</code> or a keepalive timeout, marks it as disconnected:{' '}
          <code>isConnected()</code> returns <code>false</code>, and the next call throws{' '}
          <code>Not connected to server</code>. To see the error, listen on ssh2’s client:
        </p>
      </div>
      <Code code={snippets.IDLE_ERRORS} />
      <div className="prose">
        <p>
          <code>dispose()</code> ends the connection. If SFTP close requests are still waiting for the server’s reply, it
          waits for them first, up to 2 seconds. It returns nothing.
        </p>
      </div>
    </Section>
  )
}

export function TypeScript() {
  return (
    <Section id="typescript" title="TypeScript">
      <div className="prose">
        <p>
          node-ssh includes its type declarations: <code>lib/index.d.ts</code> for <code>require</code> and{' '}
          <code>lib/index.d.mts</code> for <code>import</code>. They use types from ssh2, so TypeScript projects also need{' '}
          <code>@types/ssh2</code>. It’s an optional peer dependency, which package managers don’t install for you. No other
          compiler options are needed.
        </p>
        <p>
          Import <code>NodeSSH</code> by name. node-ssh has no default export, so TypeScript reports{' '}
          <code>import NodeSSH from &apos;node-ssh&apos;</code> as an error.
        </p>
      </div>
      <Code code={snippets.TYPES_INSTALL} lang="sh" />
      <Code code={snippets.TYPES_USAGE} lang="ts" />
    </Section>
  )
}
