#!/bin/bash -e

rm -rf dist/profiles
mkdir -p dist/profiles
{
  echo '['
  for profile in $(find ../../profiles -name \*.bin -and -size +100); do
    cp "$profile" dist/profiles
    echo "  \"$(basename "$profile")\","
  done
  echo '  null'
  echo ']'
} > dist/profiles/profiles.json