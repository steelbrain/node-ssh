#!/bin/sh
# AUTHORIZED_KEY: the public key that may log in as deploy.
set -eu

if [ -z "${AUTHORIZED_KEY:-}" ]; then
  echo 'AUTHORIZED_KEY is not set' >&2
  exit 1
fi
install -d -o deploy -g deploy -m 700 /home/deploy/.ssh
printf '%s\n' "$AUTHORIZED_KEY" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
unset AUTHORIZED_KEY

ssh-keygen -A > /dev/null
exec /usr/sbin/sshd -D -e
