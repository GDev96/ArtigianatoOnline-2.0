# Esempio per Node.js
FROM node:18-alpine

WORKDIR /app

# Copia i file di dipendenze
COPY package*.json ./
RUN npm install

# Copia il resto del codice
COPY . .

# Esponi la porta (cambia 3000 con la tua porta)
EXPOSE 3000

# Comando per avviare l'app
CMD ["npm", "start"]