# connect

Heavenly Travel Connect, the app vendors and drivers use. A vendor signs up and registers,
and once a SUPER admin approves it, keeps its own vehicles and drivers, its staff, and
answers the jobs offered to it. A driver sees the jobs offered to them, accepts or
declines, and reports each trip on the day. Production is
https://connect.heavenlytravel.my. See docs/261028-fulfilment-vendors-and-connect.md.

`pnpm dev` from the repository root runs it on http://localhost:3002; `pnpm --filter connect
dev` runs it alone. Copy `.env.example` to `.env.local` first: each setting is explained
there.

See the repository's `README.md`.
