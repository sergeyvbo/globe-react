@echo off
REM Test script for Docker Compose configuration validation (Windows)
REM This script validates Docker Compose configurations for all environments

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

REM Function to print status messages
:print_status
echo [INFO] %~1
goto :eof

:print_success
echo [SUCCESS] %~1
goto :eof

:print_warning
echo [WARNING] %~1
goto :eof

:print_error
echo [ERROR] %~1
goto :eof

REM Function to test Docker Compose configuration
:test_compose_config
set ENV=%~1
set COMPOSE_FILES=

call :print_status "Testing %ENV% environment configuration..."

REM Set compose files based on environment
if "%ENV%"=="development" (
    set COMPOSE_FILES=-f docker-compose.yml -f docker-compose.override.yml
) else if "%ENV%"=="staging" (
    set COMPOSE_FILES=-f docker-compose.yml -f docker-compose.staging.yml
) else if "%ENV%"=="production" (
    set COMPOSE_FILES=-f docker-compose.yml -f docker-compose.prod.yml
) else (
    set COMPOSE_FILES=-f docker-compose.yml
)

REM Test configuration syntax
docker-compose %COMPOSE_FILES% config >nul 2>&1
if errorlevel 1 (
    call :print_error "%ENV% configuration has errors:"
    docker-compose %COMPOSE_FILES% config 2>&1
    set /a FAILED_TESTS+=1
    goto :eof
) else (
    call :print_success "%ENV% configuration is valid"
)

REM Test service definitions
for /f "tokens=*" %%i in ('docker-compose %COMPOSE_FILES% config --services 2^>nul') do (
    set SERVICES=!SERVICES! %%i
)
call :print_status "Services in %ENV%: %SERVICES%"

REM Test port mappings
call :print_status "Checking port mappings for %ENV%..."
docker-compose %COMPOSE_FILES% config 2>nul | findstr /R "\"[0-9]*:[0-9]*\"" >nul
if not errorlevel 1 (
    call :print_status "Port mappings found in %ENV%"
)

goto :eof

REM Function to test environment variable injection
:test_env_injection
set ENV=%~1

call :print_status "Testing environment variable injection for %ENV%..."

if exist "..\environments\%ENV%.env" (
    REM Check for required variables
    set MISSING_VARS=
    
    findstr /B "DB_NAME=" "..\environments\%ENV%.env" >nul || set MISSING_VARS=!MISSING_VARS! DB_NAME
    findstr /B "DB_USER=" "..\environments\%ENV%.env" >nul || set MISSING_VARS=!MISSING_VARS! DB_USER
    findstr /B "FRONTEND_PORT=" "..\environments\%ENV%.env" >nul || set MISSING_VARS=!MISSING_VARS! FRONTEND_PORT
    findstr /B "BACKEND_PORT=" "..\environments\%ENV%.env" >nul || set MISSING_VARS=!MISSING_VARS! BACKEND_PORT
    
    if "!MISSING_VARS!"=="" (
        call :print_success "All required environment variables are present in %ENV%"
    ) else (
        call :print_warning "Missing environment variables in %ENV%: !MISSING_VARS!"
    )
    
    REM Check for environment-specific ports
    for /f "tokens=2 delims==" %%i in ('findstr /B "FRONTEND_PORT=" "..\environments\%ENV%.env" 2^>nul') do set FRONTEND_PORT=%%i
    for /f "tokens=2 delims==" %%i in ('findstr /B "BACKEND_PORT=" "..\environments\%ENV%.env" 2^>nul') do set BACKEND_PORT=%%i
    
    call :print_status "%ENV% ports - Frontend: !FRONTEND_PORT!, Backend: !BACKEND_PORT!"
    
) else (
    call :print_error "Environment file ..\environments\%ENV%.env not found"
    set /a FAILED_TESTS+=1
)

goto :eof

REM Function to test service discovery
:test_service_discovery
set ENV=%~1

call :print_status "Testing service discovery configuration for %ENV%..."

REM Set compose files based on environment
if "%ENV%"=="development" (
    set COMPOSE_FILES=-f docker-compose.yml -f docker-compose.override.yml
) else if "%ENV%"=="staging" (
    set COMPOSE_FILES=-f docker-compose.yml -f docker-compose.staging.yml
) else if "%ENV%"=="production" (
    set COMPOSE_FILES=-f docker-compose.yml -f docker-compose.prod.yml
) else (
    set COMPOSE_FILES=-f docker-compose.yml
)

REM Check database connection string
docker-compose %COMPOSE_FILES% config 2>nul | findstr "Host=database" >nul
if not errorlevel 1 (
    call :print_success "%ENV%: Backend can discover database service"
) else (
    call :print_error "%ENV%: Backend cannot discover database service"
)

REM Check frontend to backend connection
docker-compose %COMPOSE_FILES% config 2>nul | findstr "backend:5000" >nul
if not errorlevel 1 (
    call :print_success "%ENV%: Frontend can discover backend service"
) else (
    call :print_warning "%ENV%: Frontend may not be configured to discover backend service"
)

goto :eof

REM Main test function
:main
call :print_status "Starting Docker Compose configuration tests..."

REM Check if Docker Compose is available
docker-compose --version >nul 2>&1
if errorlevel 1 (
    call :print_error "docker-compose is not installed or not in PATH"
    exit /b 1
)

set FAILED_TESTS=0
set ENVIRONMENTS=development staging production

for %%e in (%ENVIRONMENTS%) do (
    echo.
    call :print_status "=== Testing %%e environment ==="
    
    call :test_compose_config %%e
    call :test_env_injection %%e
    call :test_service_discovery %%e
)

echo.
if %FAILED_TESTS%==0 (
    call :print_success "All configuration tests passed!"
    exit /b 0
) else (
    call :print_error "%FAILED_TESTS% test(s) failed"
    exit /b 1
)

REM Run main function
call :main

endlocal