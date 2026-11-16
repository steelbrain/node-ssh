#!/bin/sh
# Runs once at image build time.
set -eu

# Key-only login for deploy. Host keys are generated when the container starts (entrypoint.sh).
rm -f /etc/ssh/ssh_host_*
cat > /etc/ssh/sshd_config.d/recording.conf <<'CONF'
AllowUsers deploy
PermitRootLogin no
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
CONF
# Containers can't set the audit login uid; don't let that fail the session
sed -i 's/^session\s\+required\s\+pam_loginuid.so/session optional pam_loginuid.so/' /etc/pam.d/sshd
mkdir -p /run/sshd

# deploy has no password ('*' instead of the locked '!')
useradd --create-home --home-dir /home/deploy --shell /bin/bash deploy
usermod --password '*' deploy

install -d -o deploy -g deploy -m 755 /var/www /var/www/site
install -d -o root -g root -m 755 /var/log/app
install -o deploy -g deploy -m 644 /dev/null /var/log/app/access.log

# ~/site: a git repo with one commit. Fixed names and dates keep the commit hash stable.
runuser -u deploy -- sh -eu <<'REPO'
mkdir -p /home/deploy/site/pricing
cd /home/deploy/site
cat > index.html <<'HTML'
<!doctype html>
<title>Example</title>
<h1>Example</h1>
<p><a href="/pricing/">Pricing</a></p>
HTML
cat > pricing/index.html <<'HTML'
<!doctype html>
<title>Pricing - Example</title>
<h1>Pricing</h1>
<p>Starter: $9 per month. Team: $29 per month.</p>
HTML
git init --quiet --initial-branch=main
git add .
GIT_AUTHOR_NAME='Deploy Bot' GIT_AUTHOR_EMAIL='deploy@example.com' GIT_AUTHOR_DATE='2026-11-14T16:42:00+00:00' \
  GIT_COMMITTER_NAME='Deploy Bot' GIT_COMMITTER_EMAIL='deploy@example.com' GIT_COMMITTER_DATE='2026-11-14T16:42:00+00:00' \
  git commit --quiet -m 'Update pricing page'
REPO
