FROM grafana/grafana:12.0.1
COPY public/build /usr/share/grafana/public/build
COPY public/build/uofa-detectorliveview-datasource /var/lib/grafana/plugins/uofa-detectorliveview-datasource/
ENV GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=uofa-detectorliveview-datasource