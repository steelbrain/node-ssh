# Recordings

`sessions.json` holds the console output of the six scenarios in `scenarios/`, recorded with node-ssh against OpenSSH 9.2 (Debian bookworm) in Docker. `record.mjs` builds the image from `Dockerfile`, starts a container with a fresh ed25519 key, runs each scenario body as a Node program (connect, body, `ssh.dispose()`) and saves every stdout/stderr write with its time in ms since the body started.

To re-record, you need Docker, Node 22 or later and `ssh-keygen`, and a node-ssh checkout with `yarn install && yarn build` done. From the website root:

```sh
NODE_SSH_LABEL='14.0.0' node recordings/record.mjs /path/to/node-ssh
```

`NODE_SSH_LABEL` becomes the `nodeSsh` field. If any output differs from what `record.mjs` expects, it prints the difference and leaves `sessions.json` unchanged. It removes its container and temporary files when it exits.
