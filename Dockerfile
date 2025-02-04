
FROM nginx:stable-alpine
RUN apk add nodejs

ARG TMP_DIR=/tmp-build-dir
RUN echo ${TMP_DIR}
RUN mkdir -p $TMP_DIR
WORKDIR $TMP_DIR


ARG ARTIFACT_URL=default
RUN wget -O geo-run.tar.gz ${ARTIFACT_URL}
RUN mkdir geo-run
RUN tar xzvf geo-run.tar.gz  --strip-components=1 -C geo-run
WORKDIR ${TMP_DIR}/geo-run
COPY .env ./
RUN curl -L https://unpkg.com/@pnpm/self-installer | node
RUN pnpm install
RUN pnpm build
RUN pnpm version-manifest
RUN cp -r ../server/dist/* /usr/share/nginx/html

