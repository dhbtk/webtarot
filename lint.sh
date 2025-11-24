#!/bin/bash -e

cargo clippy --allow-dirty --fix && cargo fmt
pushd frontend
npm run lint
popd
