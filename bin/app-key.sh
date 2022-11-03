#!/usr/bin/env bash

CURRENT_APP_KEY="$1"

if [ "$CURRENT_APP_KEY" == "" ]; then
  echo "app_key=$(php ./bin/console generate:app:key || echo '')" >> $GITHUB_OUTPUT
else
  echo "app_key=$CURRENT_APP_KEY" >> $GITHUB_OUTPUT
fi;