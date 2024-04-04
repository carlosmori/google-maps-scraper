# Use a node image with support for ARM architecture
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install && \
    npm install puppeteer \
    puppeteer-extra \
    puppeteer-extra-plugin-stealth \
    cheerio \
    exceljs

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Command to run the scraper when the container starts
CMD ["node", "index.js"]
