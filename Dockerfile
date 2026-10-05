FROM node:22-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --omit=peer --no-audit --no-fund
COPY . .
ENV PORT=8787 HOST=0.0.0.0
EXPOSE 8787
ENTRYPOINT ["node", "bin/zalo-mcp.mjs"]
CMD ["serve"]
