# Configuration Validation Script
# This script validates CORS and security settings across all environments

Write-Host "Validating Backend Configuration..." -ForegroundColor Green

# Function to validate JSON configuration
function Test-JsonConfig {
    param(
        [string]$FilePath,
        [string]$Environment
    )
    
    Write-Host "`nValidating $Environment configuration..." -ForegroundColor Yellow
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "❌ Configuration file not found: $FilePath" -ForegroundColor Red
        return $false
    }
    
    try {
        $config = Get-Content $FilePath | ConvertFrom-Json
        
        # Check CORS settings
        if ($config.CorsSettings) {
            $corsOrigins = $config.CorsSettings.AllowedOrigins
            if ($corsOrigins -and $corsOrigins.Count -gt 0) {
                Write-Host "✅ CORS Origins configured: $($corsOrigins -join ', ')" -ForegroundColor Green
                
                # Check for placeholder values
                $hasPlaceholders = $corsOrigins | Where-Object { $_ -like "*PLACEHOLDER*" }
                if ($hasPlaceholders) {
                    Write-Host "⚠️  Warning: Found placeholder values in CORS origins" -ForegroundColor Yellow
                }
            } else {
                Write-Host "❌ No CORS origins configured" -ForegroundColor Red
            }
            
            # Check credentials setting
            if ($config.CorsSettings.AllowCredentials) {
                Write-Host "✅ CORS credentials enabled" -ForegroundColor Green
            }
        } else {
            Write-Host "❌ CORS settings not found" -ForegroundColor Red
        }
        
        # Check security settings
        if ($config.SecuritySettings) {
            $security = $config.SecuritySettings
            Write-Host "✅ Security Settings:" -ForegroundColor Green
            Write-Host "   - HTTPS Enforced: $($security.EnforceHttps)" -ForegroundColor Cyan
            Write-Host "   - HSTS Enabled: $($security.EnableHsts)" -ForegroundColor Cyan
            Write-Host "   - Rate Limiting: $($security.EnableRateLimiting)" -ForegroundColor Cyan
            
            if ($security.EnableSecurityHeaders) {
                Write-Host "   - Security Headers: Enabled" -ForegroundColor Cyan
            }
            
            if ($security.EnableInputValidation) {
                Write-Host "   - Input Validation: Enabled" -ForegroundColor Cyan
            }
            
            if ($security.MaxRequestSize) {
                $sizeMB = [math]::Round($security.MaxRequestSize / 1MB, 2)
                Write-Host "   - Max Request Size: $sizeMB MB" -ForegroundColor Cyan
            }
        }
        
        # Check JWT settings
        if ($config.JwtSettings) {
            $jwt = $config.JwtSettings
            if ($jwt.SecretKey -and $jwt.SecretKey -notlike "*PLACEHOLDER*") {
                Write-Host "✅ JWT Secret Key configured" -ForegroundColor Green
            } else {
                Write-Host "⚠️  JWT Secret Key needs to be set via environment variable" -ForegroundColor Yellow
            }
            
            Write-Host "   - Token Expiration: $($jwt.AccessTokenExpirationMinutes) minutes" -ForegroundColor Cyan
        }
        
        return $true
    }
    catch {
        Write-Host "❌ Error parsing JSON: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Validate all environment configurations
$environments = @(
    @{ Name = "Development"; Path = "appsettings.Development.json" },
    @{ Name = "Staging"; Path = "appsettings.Staging.json" },
    @{ Name = "Production"; Path = "appsettings.Production.json" },
    @{ Name = "Base"; Path = "appsettings.json" }
)

$allValid = $true
foreach ($env in $environments) {
    $isValid = Test-JsonConfig -FilePath $env.Path -Environment $env.Name
    $allValid = $allValid -and $isValid
}

Write-Host "`n" + ("="*50) -ForegroundColor Gray

if ($allValid) {
    Write-Host "✅ All configurations are valid!" -ForegroundColor Green
} else {
    Write-Host "❌ Some configurations have issues. Please review the output above." -ForegroundColor Red
    exit 1
}

# Additional checks for production readiness
Write-Host "`nProduction Readiness Checklist:" -ForegroundColor Yellow
Write-Host "- Ensure JWT_SECRET_KEY environment variable is set in production" -ForegroundColor Cyan
Write-Host "- Verify CORS origins match your actual frontend URLs" -ForegroundColor Cyan
Write-Host "- Confirm HTTPS is enforced in production" -ForegroundColor Cyan
Write-Host "- Check that rate limiting is appropriately configured" -ForegroundColor Cyan
Write-Host "- Validate that security headers are enabled" -ForegroundColor Cyan