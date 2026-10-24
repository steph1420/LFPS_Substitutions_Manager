// Package version holds the server's release version.
//
// The single source of truth is the "version" field of the repository's root
// package.json. Do not edit this constant by hand: run `npm run version:sync`
// from the repo root. `npm test` fails (`npm run version:check`) on drift.
package version

const Version = "2.0.0-alpha.3"
