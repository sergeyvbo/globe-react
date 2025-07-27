# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src

# Copy csproj and restore dependencies (for better layer caching)
COPY GeoQuizApi.csproj .
RUN dotnet restore

# Copy source code and build
COPY . .
RUN dotnet publish -c Release -o /app/publish --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS runtime
WORKDIR /app

# Install curl for health checks (as root before switching user)
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r geoquiz && useradd -r -g geoquiz geoquiz

# Create data and logs directories with proper permissions
RUN mkdir -p /app/data /app/logs && chown -R geoquiz:geoquiz /app/data /app/logs

# Copy published application
COPY --from=build /app/publish .

# Set ownership of application files
RUN chown -R geoquiz:geoquiz /app

# Switch to non-root user
USER geoquiz

# Set environment variables for production
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:5000
ENV ConnectionStrings__DefaultConnection="Data Source=/app/data/geoquiz.db"

# IMPORTANT: The following environment variables must be provided at runtime:
# 
# REQUIRED:
# - JwtSettings__SecretKey: JWT secret key (minimum 32 characters)
#
# OPTIONAL (with sensible defaults):
# - CorsSettings__AllowedOrigins__0: First allowed CORS origin
# - SecuritySettings__EnforceHttps: Enable HTTPS enforcement (default: true)
# - SecuritySettings__EnableHsts: Enable HSTS headers (default: true)
#
# Example usage:
# docker run -e JwtSettings__SecretKey="your-secret-key-here" \
#            -e CorsSettings__AllowedOrigins__0="http://localhost" \
#            -p 5000:5000 geoquiz-backend

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Start the application
ENTRYPOINT ["dotnet", "GeoQuizApi.dll"]