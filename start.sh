#!/bin/sh
/nakama/nakama migrate up --database.address $DATABASE_URL
/nakama/nakama --config /nakama/data/local.yml \
  --database.address $DATABASE_URL \
  --runtime.env "HF_TOKEN=$HF_TOKEN" \
  --runtime.env "HF_MODEL=$HF_MODEL"