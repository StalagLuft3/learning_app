FROM node:25
WORKDIR /app
# Copy package files and install dependencies
COPY package*.json ./
RUN npm install
# Copy all source code
COPY . .
 
# Add wait-for-it script
COPY wait-for-it.sh ./
RUN chmod +x wait-for-it.sh

# Install postgres-client for DB readiness check
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*
# Generate Prisma client after code is present
RUN npx prisma generate
# Copy .env if present
COPY .env .
# Make entrypoint.sh executable
RUN chmod +x entrypoint.sh
EXPOSE 3000
# Use entrypoint.sh for startup
CMD ["./entrypoint.sh"]
