#!/bin/bash
# Appends one short access log line (time, client, request, status, bytes) to /var/log/app/access.log every 0.3-0.6s until killed.
set -eu

RANDOM=36 # The same sequence of lines on every run
ips=(203.0.113.24 198.51.100.7 203.0.113.81 198.51.100.142 203.0.113.9)
requests=(
  '/ 200 1843'
  '/pricing/ 200 2310'
  '/about/ 200 1652'
  '/assets/app.css 304 0'
  '/assets/app.js 304 0'
  '/assets/logo.svg 304 0'
  '/assets/app.css 200 2941'
  '/favicon.ico 200 1150'
)

# Stop the pending sleep too when record.mjs stops the writer
sleeper=
trap 'kill $sleeper 2> /dev/null; exit 0' TERM INT

while true; do
  delay=0.$((3 + RANDOM % 4))
  sleep "$delay" &
  sleeper=$!
  wait $sleeper
  ip=${ips[RANDOM % ${#ips[@]}]}
  read -r path status bytes <<< "${requests[RANDOM % ${#requests[@]}]}"
  printf '%s %s GET %s %s %s\n' "$(date -u '+%H:%M:%S')" "$ip" "$path" "$status" "$bytes" >> /var/log/app/access.log
done
