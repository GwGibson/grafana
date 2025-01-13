FROM grafana/grafana:latest
# Copy the compiled front-end assets into the Docker image - front-end must be built locally!
COPY /public/build /usr/share/grafana/public/build
