FROM heroiclabs/nakama:3.15.0

COPY local.yml /nakama/data/local.yml
COPY backend/build /nakama/data/modules/build
COPY start.sh /nakama/start.sh
RUN chmod +x /nakama/start.sh

ENTRYPOINT ["/nakama/start.sh"]