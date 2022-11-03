#!/usr/bin/env bash

if [ -f "composer.json" ]; then
  echo "uses_composer=true" >> $GITHUB_OUTPUT
else
  echo "uses_composer=false" >> $GITHUB_OUTPUT
fi;