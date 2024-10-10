FROM node:20 as base
WORKDIR /home/node/app
COPY --chown=node:node . .
RUN npm install && \
    npm run build

FROM node:20 as runtime
WORKDIR /home/node/app
COPY --from=base /home/node/app/package.json /home/node/app/package-lock.json ./
RUN npm install --omit=dev
COPY --from=base /home/node/app/build ./build
USER node
EXPOSE 8080
CMD [ "npm", "start" ]
