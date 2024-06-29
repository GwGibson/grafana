FROM ubuntu:latest

ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    git \
    gcc \
    g++ \
    make \
    ca-certificates \
    file \
    gnupg \
    lsb-release \
    apt-transport-https \
    software-properties-common && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Docker CE
RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add - && \
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" && \
    apt-get update && \
    apt-get install -y docker-ce docker-ce-cli containerd.io && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Docker Buildx
RUN mkdir -p /root/.docker/cli-plugins && \
    curl -L "https://github.com/docker/buildx/releases/download/v0.13.1/buildx-v0.13.1.linux-amd64" -o /root/.docker/cli-plugins/docker-buildx && \
    chmod a+x /root/.docker/cli-plugins/docker-buildx

# Install Go
ENV GO_VERSION=1.22.1
RUN curl -sL "https://golang.org/dl/go${GO_VERSION}.linux-amd64.tar.gz" | tar -xz -C /usr/local

# Install Node.js, Yarn, and NX
RUN curl -sL https://deb.nodesource.com/setup_lts.x | bash - && \
    apt-get update && \
    apt-get install -y nodejs && \
    npm install --global yarn nx

# Cleanup
RUN apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV PATH=$PATH:/usr/local/go/bin
ENV DEBIAN_FRONTEND=dialog
ENV GF_DASHBOARDS_MIN_REFRESH_INTERVAL="100ms"

SHELL ["/bin/bash", "-c"]
