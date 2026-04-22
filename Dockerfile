FROM heroiclabs/nakama:3.15.0

COPY local.yml /nakama/data/local.yml
COPY backend/build /nakama/data/modules/build