#!/usr/bin/env bash

CURRENT_APP_KEY="$1"

if [ "$CURRENT_APP_KEY" == "" ]; then
  echo "::set-output name=app_key::$(php ./bin/console generate:app:key || echo '')"
else
  echo "::set-output name=app_key::$CURRENT_APP_KEY"
fi;