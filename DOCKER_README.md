# Docker Setup for GeoQuiz

This document describes how to run the GeoQuiz application using Docker Compose.

## Quick Start

1. **Clone the repository and navigate to the project directory**
   ```bash
   git clone <repository-url>
   cd globe-react
   ```

2. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env and set your JWT secret key (minimum 32 characters)
   # JWT_SECRET_KEY=your-super-secret-jwt-key-that-is-at-least-32-characters-long
   ```

3. **Start the application**
   ```bash
   docker compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:8080 или http://localhost:6666
   - Backend API: http://localhost:8080/api или http://localhost:6666/api (proxied through nginx)

## Services

### Frontend (geoquiz-frontend)
- **Ports**: 8080 и 6666 (external) → 80 (internal)
- **Technology**: React + Vite served by nginx
- **Health Check**: Available at `/health`

### Backend (geoquiz-backend)
- **Port**: 5000 (internal only)
- **Technology**: .NET 10 API
- **Database**: SQLite with persistent volume
- **Health Check**: Available at `/health`

## Data Persistence

The SQLite database is stored in a named Docker volume (`geoquiz-sqlite-data`) that persists data between container restarts.

## Environment Variables

Key environment variables in `.env`:

- `JWT_SECRET_KEY`: JWT secret for authentication (required, min 32 chars)
- `CORS_ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins
- `ENFORCE_HTTPS`: Enable HTTPS enforcement (default: false for development)
- `ENABLE_HSTS`: Enable HSTS headers (default: false for development)

## Commands

```bash
# Start services
docker compose up

# Start services in background
docker compose up -d

# Build and start services
docker compose up --build

# Stop services
docker compose down

# View logs
docker compose logs

# View logs for specific service
docker compose logs frontend
docker compose logs backend

# Check service status
docker compose ps
```

## Development

For development with live reload, you can mount source code volumes by creating a `docker-compose.override.yml` file (this will be covered in a future task).

## Troubleshooting

1. **Port conflicts**: Ensure ports 8080 and 6666 are not in use by other applications
2. **Build failures**: Run `docker compose build --no-cache` to rebuild from scratch
3. **Database issues**: Remove the volume with `docker volume rm geoquiz-sqlite-data` to reset the database
4. **Health check failures**: Check service logs with `docker compose logs <service-name>`