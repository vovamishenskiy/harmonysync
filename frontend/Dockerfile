FROM node:18-alpine

WORKDIR /var/www/harmonysync/frontend

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 4173

CMD ["npm", "run", "preview"]
