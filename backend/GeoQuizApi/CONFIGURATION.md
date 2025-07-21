# GeoQuiz API Configuration Guide

## Environment Configuration

The application supports multiple environments with different configuration files:

### Configuration Files

- `appsettings.json` - Base configuration for all environments
- `appsettings.Development.json` - Development-specific settings
- `appsettings.Production.json` - Production-specific settings

### Environment Variables

The following environment variables can be used to override configuration settings:

#### Required for Production
- `JwtSettings__SecretKey` - JWT signing key (minimum 32 characters)
- `ConnectionStrings__DefaultConnection` - Database connection string

#### Optional
- `ASPNETCORE_ENVIRONMENT` - Environment name (Development/Production)
- `CorsSettings__AllowedOrigins__0` - Primary allowed CORS origin
- `CorsSettings__AllowedOrigins__1` - Secondary allowed CORS origin (if needed)

### Development Environment

Default settings for local development:
- Database: SQLite (`geoquiz.db`)
- JWT Secret: Development key (auto-generated)
- CORS: Allows `http://localhost:3000`
- Logging: Detailed logging to console

### Production Environment

Settings for production deployment:
- Database: Configurable via environment variable
- JWT Secret: Must be provided via environment variable
- CORS: Configurable allowed origins
- Logging: Minimal logging, structured format

## Example Usage

### Development
```bash
dotnet run
```

### Production
```bash
# Windows PowerShell
$env:ASPNETCORE_ENVIRONMENT="Production"
$env:JwtSettings__SecretKey="your-super-secret-production-key-32-chars"
$env:CorsSettings__AllowedOrigins__0="https://yourdomain.com"
dotnet run

# Linux/macOS
export ASPNETCORE_ENVIRONMENT=Production
export JwtSettings__SecretKey="your-super-secret-production-key-32-chars"
export CorsSettings__AllowedOrigins__0="https://yourdomain.com"
dotnet run
```

## Security Considerations

1. **JWT Secret Key**: Must be at least 32 characters long and kept secure
2. **Database Connection**: Use secure connection strings in production
3. **CORS Origins**: Only allow trusted domains in production
4. **Environment Variables**: Store sensitive data in environment variables, not in config files

## Configuration Validation

The application validates configuration on startup:
- JWT secret key length
- Database connection availability
- Required settings presence