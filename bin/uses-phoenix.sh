#!/usr/bin/env bash

if [ -f "./bin/phoenix" ] || [ -f "./bin/phoenix.bat" ]; then
  echo "::set-output name=uses_phoenix::1";
else
  echo "::set-output name=uses_phoenix::0";
fi;