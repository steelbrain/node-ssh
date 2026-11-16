node-ssh.com
============

Source code for [node-ssh.com](https://node-ssh.com), the website of [node-ssh](https://github.com/steelbrain/node-ssh). It is a Next.js app with one page.

```sh
yarn dev     # development server
yarn build   # static production build
yarn lint    # oxlint and oxfmt --check
yarn format  # oxfmt
```

- `app/_sections/` holds the page's sections and `lib/snippets.ts` the code samples in the guide.
- The examples at the top play back real output from `recordings/sessions.json`. `recordings/README.md` explains how to record it again for a new release.
