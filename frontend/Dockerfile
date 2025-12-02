FROM ubuntu:20.04

# Avoid prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies + curl to download Crow
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libboost-all-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Download Crow header (single file version)
RUN curl -L https://github.com/CrowCpp/Crow/releases/download/v1.0+5/crow_all.h -o src/crow_all.h

# Copy the rest of the source code
COPY . .

# Build
RUN mkdir build && cd build && cmake .. && make

EXPOSE 8080

CMD ["./build/cpp_service"]