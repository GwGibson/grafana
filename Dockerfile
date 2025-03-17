FROM grafana/grafana:10.4.0

# Copy the front-end assets for Detector canvas element
COPY /public/build /usr/share/grafana/public/build

# For plugin
COPY dlv-datasource.zip /tmp/
USER root
RUN mkdir -p /var/lib/grafana/plugins/dlv-datasource && \
    unzip /tmp/dlv-datasource.zip -d /var/lib/grafana/plugins/dlv-datasource && \
    cd /var/lib/grafana/plugins/dlv-datasource && \
    mv gpx_detector_live_view_linux_amd64 gpx_detector_live_view && \
    chmod +x gpx_detector_live_view && \
    GRAFANA_USER=$(stat -c '%U' /usr/share/grafana) && \
    GRAFANA_GROUP=$(stat -c '%G' /usr/share/grafana) && \
    chown -R $GRAFANA_USER:$GRAFANA_GROUP /var/lib/grafana/plugins && \
    rm /tmp/dlv-datasource.zip

RUN echo "[plugins]\nallow_loading_unsigned_plugins = dlv-datasource\nplugin_admin_enabled = true" > /etc/grafana/grafana.ini
USER grafana
ENV GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS="dlv-datasource"
ENV GF_PLUGINS_PLUGIN_ADMIN_ENABLED=true
