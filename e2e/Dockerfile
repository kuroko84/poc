# Image tag must match the @playwright/test version in package.json
FROM mcr.microsoft.com/playwright:v1.64.1-noble
WORKDIR /work
COPY package.json package-lock.json ./
RUN npm ci
COPY e2e ./e2e
ENTRYPOINT ["npx", "playwright", "test", "-c", "e2e"]
