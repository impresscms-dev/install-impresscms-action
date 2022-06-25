#!/usr/bin/env bash

if [ -f "composer.json" ]; then
  echo "::set-output name=uses_composer::true";
else
  echo "::set-output name=uses_composer::false";
fi;