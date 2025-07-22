@echo off
REM Test script for service connectivity and networking (Windows)
REM This script tests if services can communicate with each other

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

REM Function to test service connectivity
:test_connectivity
set ENV=%~1
set COMPOSE_FILES=

call :print_status "Testing service connectivity for %ENV% environment..."

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

REM Start services in detached mode
call :print_status "Starting services for connectivity test..."
docker-compose %COMPOSE_FILES% up -d --build
if errorlevel 1 (
    call :print_error "Failed to start services"
    goto :cleanup
)
call :print_success "Services started successfully"

REM Wait for services to be ready
call :print_status "Waiting for services to be ready..."
timeout /t 30 /nobreak >nul

REM Test database connectivity from backend
call :print_status "Testing database connectivity from backend..."
docker-compose %COMPOSE_FILES% exec -T backend sh -c "nc -z database 5432" >nul 2>&1
if not errorlevel 1 (
    call :print_success "Backend can connect to database"
) else (
    call :print_error "Backend cannot connect to database"
)

REM Test backend connectivity from frontend
call :print_status "Testing backend connectivity from frontend..."
docker-compose %COMPOSE_FILES% exec -T frontend sh -c "nc -z backend 5000" >nul 2>&1
if not errorlevel 1 (
    call :print_success "Frontend can connect to backend"
) else (
    call :print_error "Frontend cannot connect to backend"
)

REM Test external port accessibility
set FRONTEND_PORT=3000
if "%ENV%"=="staging" set FRONTEND_PORT=6666
if "%ENV%"=="production" set FRONTEND_PORT=6666

call :print_status "Testing external port accessibility on port %FRONTEND_PORT%..."
curl -f -s "http://localhost:%FRONTEND_PORT%/health" >nul 2>&1
if not errorlevel 1 (
    call :print_success "Frontend is accessible on port %FRONTEND_PORT%"
) else (
    call :print_warning "Frontend may not be accessible on port %FRONTEND_PORT% (this is normal if health endpoint is not implemented)"
)

REM Test API endpoint
set BACKEND_PORT=5000
if "%ENV%"=="staging" set BACKEND_PORT=5001

call :print_status "Testing API endpoint accessibility on port %BACKEND_PORT%..."
curl -f -s "http://localhost:%BACKEND_PORT%/health" >nul 2>&1
if not errorlevel 1 (
    call :print_success "Backend API is accessible on port %BACKEND_PORT%"
) else (
    call :print_warning "Backend API may not be accessible on port %BACKEND_PORT% (this is normal if health endpoint is not implemented)"
)

REM Show running services
call :print_status "Currently running services:"
docker-compose %COMPOSE_FILES% ps

:cleanup
REM Cleanup
call :print_status "Stopping test services..."
docker-compose %COMPOSE_FILES% down >nul 2>&1

goto :eof

REM Function to test volume mounts
:test_volumes
set ENV=%~1

call :print_status "Testing volume mounts for %ENV% environment..."

set COMPOSE_FILES=
if "%ENV%"=="development" (
    set COMPOSE_FILES=-f docker-compose.yml -f docker-compose.override.yml
) else if "%ENV%"=="staging" (
    set COMPOSE_FILES=-f docker-compose.yml -f docker-compose.staging.yml
) else if "%ENV%"=="production" (
    set COMPOSE_FILES=-f docker-compose.yml -f docker-compose.prod.yml
) else (
    set COMPOSE_FILES=-f docker-compose.yml
)

REM Check volume definitions
docker-compose %COMPOSE_FILES% config --volumes >temp_volumes.txt 2>nul
if exist temp_volumes.txt (
    for /f %%i in (temp_volumes.txt) do (
        call :print_success "Volume definition found for %ENV%: %%i"
    )
    
    REM Test if volumes are properly configured for persistence
    findstr "postgres.*data" temp_volumes.txt >nul 2>&1
    if not errorlevel 1 (
        call :print_success "Database persistence volume configured"
    ) else (
        call :print_warning "Database persistence volume may not be configured"
    )
    
    findstr "backend.*logs" temp_volumes.txt >nul 2>&1
    if not errorlevel 1 (
        call :print_success "Backend logs volume configured"
    ) else (
        call :print_warning "Backend logs volume may not be configured"
    )
    
    del temp_volumes.txt
) else (
    call :print_warning "No volumes defined for %ENV% environment"
)

goto :eof

REM Main function
:main
set ENV=%~1
if "%ENV%"=="" set ENV=staging

call :print_status "Starting service connectivity tests for %ENV% environment..."

REM Check prerequisites
docker-compose --version >nul 2>&1
if errorlevel 1 (
    call :print_error "docker-compose is not installed or not in PATH"
    exit /b 1
)

curl --version >nul 2>&1
if errorlevel 1 (
    call :print_error "curl is not installed or not in PATH"
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    call :print_error "Docker is not running. Please start Docker and try again."
    exit /b 1
)

echo.
call :test_volumes "%ENV%"

echo.
call :test_connectivity "%ENV%"
call :print_success "Service connectivity tests completed for %ENV%"

goto :eof

REM Show help if requested
if "%1"=="help" goto :help
if "%1"=="-h" goto :help
if "%1"=="--help" goto :help
goto :main

:help
echo Service Connectivity Test Script
echo.
echo Usage: %0 [environment]
echo.
echo Environments:
echo   development    - Development environment
echo   staging        - Staging environment (default)
echo   production     - Production environment
echo.
echo This script tests:
echo   - Service-to-service connectivity
echo   - External port accessibility
echo   - Volume mount configurations
echo   - Network configuration
exit /b 0

REM Run main function
call :main %*

endlocal