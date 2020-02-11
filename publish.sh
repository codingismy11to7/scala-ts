#!/usr/bin/env bash

npm run clean && npm run test:prod && npx tsc && mkdir staging && cp -a dist/* staging && cp package.json LICENSE README.md staging && cd staging && npm publish # --dry-run