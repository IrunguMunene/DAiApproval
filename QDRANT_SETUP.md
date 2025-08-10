# Qdrant Setup Guide

The system supports flexible Qdrant deployment options. Choose the method that fits your environment:

## Option 1: Docker (Recommended for Development)

```bash
# Start Qdrant using docker-compose
docker-compose -f docker-compose.qdrant.yml up -d

# Or run directly with Docker
docker run -p 6333:6333 -v $(pwd)/qdrant_storage:/qdrant/storage qdrant/qdrant
```

## Option 2: Local Installation

### Windows
```bash
# Download from GitHub releases
# https://github.com/qdrant/qdrant/releases
# Extract and run qdrant.exe
```

### Linux/macOS
```bash
# Using cargo
cargo install qdrant

# Or download binary
wget https://github.com/qdrant/qdrant/releases/latest/download/qdrant-x86_64-unknown-linux-gnu.tar.gz
tar -xzf qdrant-x86_64-unknown-linux-gnu.tar.gz
./qdrant
```

## Option 3: Managed Service
- Qdrant Cloud: https://cloud.qdrant.io/
- Update `Qdrant:BaseUrl` in appsettings.json

## Required Ollama Model

```bash
# Pull the embedding model
ollama pull nomic-embed-text
```

## Configuration

The system automatically configures itself based on `appsettings.json`:

```json
{
  "Qdrant": {
    "BaseUrl": "http://localhost:6333",
    "EnableSimilaritySearch": true
  },
  "Ollama": {
    "EmbeddingModel": "nomic-embed-text"
  }
}
```

## Deployment Scenarios

### Development
- Use Docker Compose: `docker-compose -f docker-compose.qdrant.yml up -d`
- Qdrant URL: `http://localhost:6333`

### Production Server
- Install Qdrant locally or use managed service
- Update `Qdrant:BaseUrl` accordingly
- Ensure Ollama is running with `nomic-embed-text` model

### Disable Vector Search (Optional)
Set `"EnableSimilaritySearch": false` to disable vector similarity features.