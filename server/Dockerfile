FROM node:21-alpine

WORKDIR /app

RUN apk update && apk add --no-cache g++ openjdk11-jdk python3

COPY package.json .

RUN yarn install

COPY . .

EXPOSE 8080

CMD ["yarn", "dev"]