FROM alpine:3.20 AS assets
WORKDIR /assets
COPY index.html cartup-logo.svg ./

FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=assets /assets/ /usr/share/nginx/html/

CMD ["nginx", "-g", "daemon off;"]

