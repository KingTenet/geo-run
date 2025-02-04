
FROM nginx:stable-alpine
RUN apk add nodejs

ARG TMP_DIR=/tmp-build-dir
RUN echo ${TMP_DIR}
RUN mkdir -p $TMP_DIR
WORKDIR $TMP_DIR
COPY manifest.json ./


ARG ARTIFACT_URL=default
RUN wget -O geo-app.tar.gz ${ARTIFACT_URL}
RUN mkdir geo-app
RUN tar xzvf geo-app.tar.gz  --strip-components=1 -C geo-app
WORKDIR ${TMP_DIR}/geo-app
COPY .env ./
RUN curl -L https://unpkg.com/@pnpm/self-installer | node
RUN pnpm install
RUN pnpm build
RUN cp -r dist/* /usr/share/nginx/html

