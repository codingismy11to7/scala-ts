#!/usr/bin/env bash

npm run clean && npm run test:prod && npx tsc --module commonjs && npx rollup -c rollup.config.ts && mkdir staging && cp -a dist/* staging && cp -a legacy staging && cp package.json LICENSE README.md staging && cd staging && npm publish #--dry-run