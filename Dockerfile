FROM grafana/grafana:12.0.1
COPY public/build /usr/share/grafana/public/build
COPY public/build/dlv-datasource /var/lib/grafana/plugins/dlv-datasource/
ENV GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=dlv-datasource