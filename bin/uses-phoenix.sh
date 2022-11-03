#!/usr/bin/env bash

if [ -f "./bin/phoenix" ] || [ -f "./bin/phoenix.bat" ]; then
  echo "uses_phoenix=1" >> $GITHUB_OUTPUT
else
  echo "uses_phoenix=0" >> $GITHUB_OUTPUT
fi;