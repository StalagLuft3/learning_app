FROM node:25
WORKDIR /app
# Copy package files and install dependencies
COPY package*.json ./
RUN npm install
# Copy all source code
COPY . .
 
# Add wait-for-it script
COPY wait-for-it.sh ./

# Install postgres-client for DB readiness check
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*
# Generate Prisma client after code is present
RUN npx prisma generate
# Fix Windows line endings and make scripts executable
RUN sed -i 's/\r//' entrypoint.sh wait-for-it.sh && chmod +x entrypoint.sh wait-for-it.sh
EXPOSE 3000
# Use entrypoint.sh for startup
CMD ["./entrypoint.sh"]
