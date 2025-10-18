# Use an official Node.js image
FROM node:18

# Set working directory inside the container
WORKDIR /app

# Copy only the NodeJS server part
COPY src/node_server ./src/node_server

# Set working directory to the NodeJS server directory
WORKDIR /app/src/node_server

# Install dependencies
RUN npm install

# Expose the port (optional; for documentation)
EXPOSE 3000

# Run the server
CMD ["node", "index.js"]