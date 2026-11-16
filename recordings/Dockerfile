# OpenSSH server for record.mjs. Build context: this directory.
FROM debian:bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssh-server git procps \
  && rm -rf /var/lib/apt/lists/*

COPY server/setup.sh server/entrypoint.sh server/access-log-writer.sh /usr/local/sbin/
RUN chmod 755 /usr/local/sbin/setup.sh /usr/local/sbin/entrypoint.sh /usr/local/sbin/access-log-writer.sh \
  && /usr/local/sbin/setup.sh

# On the container's overlay filesystem, tail -f polls once a second instead of using inotify
VOLUME ["/var/log/app"]

EXPOSE 22
ENTRYPOINT ["/usr/local/sbin/entrypoint.sh"]
