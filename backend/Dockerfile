FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

# Use npm install to avoid requiring a package-lock.json during docker build
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "src/index.js"]
