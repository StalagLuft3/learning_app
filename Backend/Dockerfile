FROM node:25
WORKDIR /app
# Copy package files and install dependencies
COPY package*.json ./
RUN npm install
# Copy all source code
COPY . .
# Generate Prisma client after code is present
RUN npx prisma generate
# Copy .env if present
COPY .env .
# Make entrypoint.sh executable
RUN chmod +x entrypoint.sh
EXPOSE 3000
# Use entrypoint.sh for startup
CMD ["./entrypoint.sh"]
