#!/bin/bash -e

for i in backend shared cmdline; do
  pushd $i
  cargo clippy --allow-dirty --fix && cargo fmt
  popd
done

pushd frontend
npm ci
popd
