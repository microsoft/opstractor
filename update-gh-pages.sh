#!/bin/bash -ex

pushd src/frontend
rm -rf dist
npm run release
popd

rm -rf docs
cp -a src/frontend/dist docs