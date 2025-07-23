# CORS and Security Configuration Update

## Overview
This document summarizes the updates made to the backend configuration to ensure proper CORS settings and enhanced security for all deployment environments.

## Changes Made

### 1. Production CORS Configuration (`appsettings.Production.json`)
**Updated CORS origins to include:**
- `http://10.66.66.64:6666` (primary frontend URL)
- `http://10.66.66.64` (fallback without port)
- `https://10.66.66.64:6666` (HTTPS version)
- `https://10.66.66.64` (HTTPS fallback)

**Enhanced security settings:**
- Added `EnableSecurityHeaders: true`
- Added `EnableInputValidation: true`
- Added `MaxRequestSize: 10485760` (10MB limit)
- Added `RequestTimeout: 30` seconds
- Updated `AllowedHosts` to be more restrictive: `"10.66.66.64;localhost"`

### 2. New Staging Configuration (`appsettings.Staging.json`)
**Created new staging environment configuration with:**
- CORS origins: `http://localhost:6666`, `http://127.0.0.1:6666`
- Moderate security settings (between development and production)
- JWT expiration: 120 minutes
- Rate limiting: 8 auth requests/minute, 80 general requests/minute
- Log retention: 14 days

### 3. Enhanced SecuritySettings Class
**Added new properties:**
- `EnableSecurityHeaders` - Controls security headers middleware
- `EnableInputValidation` - Controls input validation middleware
- `MaxRequestSize` - Maximum request body size in bytes
- `RequestTimeout` - Request timeout in seconds

### 4. Updated Middleware Configuration
**Modified Program.cs to:**
- Conditionally apply security middleware based on settings
- Configure Kestrel with request size and timeout limits
- Respect the new security configuration options

### 5. Enhanced InputValidationMiddleware
**Updated to:**
- Use SecuritySettings configuration
- Skip validation when `EnableInputValidation` is false
- Maintain existing XSS and SQL injection protection

## Environment-Specific Settings

### Development
- **CORS**: Allows localhost:3000, localhost:5173, and 127.0.0.1 variants
- **Security**: Relaxed (HTTPS disabled, no rate limiting)
- **Purpose**: Local development with hot reload support

### Staging
- **CORS**: Allows localhost:6666 and 127.0.0.1:6666
- **Security**: Moderate (HTTPS enabled, rate limiting enabled)
- **Purpose**: Pre-production testing environment

### Production
- **CORS**: Allows 10.66.66.64:6666 with HTTP/HTTPS variants
- **Security**: Strict (all security features enabled)
- **Purpose**: Production deployment with maximum security

## Security Features Enabled

### Production Security Stack
1. **HTTPS Enforcement**: Redirects HTTP to HTTPS
2. **HSTS**: HTTP Strict Transport Security headers
3. **Security Headers**: XSS protection, content type options, frame options
4. **Rate Limiting**: 5 auth requests/minute, 60 general requests/minute
5. **Input Validation**: XSS and SQL injection protection
6. **Request Size Limits**: 10MB maximum request size
7. **Request Timeouts**: 30-second timeout protection

### CORS Security
- **Credential Support**: Enabled for authenticated requests
- **Specific Origins**: No wildcard origins in production
- **Method Restrictions**: Only necessary HTTP methods allowed
- **Header Restrictions**: Specific headers whitelisted

## Validation and Testing

### Configuration Validation Script
Created `validate-config.ps1` to verify:
- CORS origins are properly configured
- Security settings are appropriate for each environment
- JWT settings are valid
- No placeholder values in production

### CORS Testing
Created `test-cors-config.http` with test requests for:
- Preflight OPTIONS requests
- Actual API requests with different origins
- Development and production scenarios

## Environment Variables Required

### Production
- `JWT_SECRET_KEY` - Must be set via environment variable
- `CorsSettings__AllowedOrigins__0` - Can override CORS origins if needed

### Staging
- `JWT_SECRET_KEY_STAGING` - Staging-specific JWT secret
- `DB_PASSWORD_STAGING` - Staging database password

## Deployment Considerations

1. **Environment Variables**: Ensure all required environment variables are set
2. **CORS Origins**: Verify frontend URLs match CORS configuration
3. **SSL Certificates**: Ensure HTTPS is properly configured for staging/production
4. **Rate Limiting**: Monitor and adjust rate limits based on usage patterns
5. **Request Limits**: Adjust MaxRequestSize if larger uploads are needed

## Monitoring and Maintenance

### Log Monitoring
- Security middleware logs all blocked requests
- CORS violations are logged with client IP
- Rate limiting violations are tracked

### Regular Reviews
- Review CORS origins when frontend URLs change
- Update security settings based on threat assessment
- Monitor rate limiting effectiveness
- Validate SSL certificate renewals

## Troubleshooting

### Common CORS Issues
1. **Origin not allowed**: Add frontend URL to appropriate environment config
2. **Credentials not working**: Ensure `AllowCredentials: true` and specific origins
3. **Preflight failures**: Check allowed methods and headers

### Security Issues
1. **Rate limiting too strict**: Adjust limits in SecuritySettings
2. **Request size exceeded**: Increase MaxRequestSize if needed
3. **Input validation false positives**: Review validation patterns

## Troubleshooting and Fixes

### Variable Declaration Issue (Fixed)
**Issue**: Compilation error due to `securitySettings` variable being used before declaration
**Solution**: Moved security settings declaration to the top of the app configuration section

### Testing and Validation
- ✅ Configuration validation script passes all checks
- ✅ Backend compiles successfully
- ✅ Application starts without errors
- ✅ All security middleware properly configured

## Next Steps

1. Deploy updated configuration to staging environment
2. Test CORS functionality with actual frontend
3. Monitor security logs for any issues
4. Update production environment variables
5. Validate HTTPS configuration in production

This configuration provides a robust security foundation while maintaining proper CORS support for the frontend integration.