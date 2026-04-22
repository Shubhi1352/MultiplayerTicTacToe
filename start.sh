#!/bin/sh
/nakama/nakama migrate up --database.address $DATABASE_URL
/nakama/nakama --config /nakama/data/local.yml --database.address $DATABASE_URL