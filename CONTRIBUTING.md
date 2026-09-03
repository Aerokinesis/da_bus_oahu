# Contributing to Where Da Bus Stay?

Thanks for wanting to help out — this started as a personal project to replace DaBus2, and contributions that make it more useful for Oahu riders are welcome.

## Before you start

For anything bigger than a small fix (a new feature, a UI redesign, a big refactor), open an issue first to talk through the approach. It's a lot easier to align before code gets written than to rework a finished PR.

For small fixes (typos, obvious bugs, small copy changes), feel free to just open a PR directly.

## Getting set up

Follow the "Getting started" section in the [README](README.md) — you'll need an OTS API key, mkcert for local HTTPS, and the GTFS data files.

## Making changes

- Keep PRs focused on one thing. A PR that fixes a bug and also reformats unrelated files is harder to review and more likely to get stuck.
- Match the existing code style — this codebase favors small custom hooks (`src/hooks/`) for state/data logic, keeps components presentational, and comments the *why* behind non-obvious decisions (see existing comments for the pattern).
- Test your changes locally against both the mobile and desktop layouts before opening a PR — this app is used daily on phones at bus stops, so regressions there matter most.
- If you touch `server.js`, keep the existing input validation and rate-limiting patterns for any new endpoint.

## Submitting a PR

- Describe what changed and why, not just what.
- Link the issue it relates to, if there is one.
- Screenshots or a short screen recording are appreciated for any UI change.

## Code review

All PRs are reviewed before merging — this keeps a consistent standard across the app and keeps the project maintainable for everyone using it. Don't take requested changes personally; it's usually about keeping things consistent, not about the idea being wrong.

## License

By contributing, you agree that your contributions will be licensed under this project's [MIT License](LICENSE).
