FROM node:20

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

EXPOSE 3000

# Start the dev server with proper host binding
CMD ["npm", "start", "--", "--host", "0.0.0.0", "--port", "3000"]