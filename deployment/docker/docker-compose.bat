@echo off
REM Docker Compose management script for GeoQuiz application (Windows)
REM Usage: docker-compose.bat [environment] [command]

setlocal enabledelayedexpansion

REM Default values
set ENVIRONMENT=%1
set COMMAND=%2

if "%ENVIRONMENT%"=="" set ENVIRONMENT=development
if "%COMMAND%"=="" set COMMAND=up

REM Get script directory
set SCRIPT_DIR=%~dp0

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

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    call :print_error "Docker is not running. Please start Docker and try again."
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    call :print_warning "Environment file .env not found."
    if exist ".env.example" (
        call :print_status "Copying .env.example to .env"
        copy ".env.example" ".env" >nul
        call :print_warning "Please update the values in .env before running again."
        exit /b 1
    ) else (
        call :print_error "No environment file template found."
        exit /b 1
    )
)

REM Get Docker Compose files based on environment
set COMPOSE_FILES=-f docker-compose.yml

if "%ENVIRONMENT%"=="development" (
    if exist "docker-compose.override.yml" (
        set COMPOSE_FILES=!COMPOSE_FILES! -f docker-compose.override.yml
    )
) else if "%ENVIRONMENT%"=="dev" (
    if exist "docker-compose.override.yml" (
        set COMPOSE_FILES=!COMPOSE_FILES! -f docker-compose.override.yml
    )
) else if "%ENVIRONMENT%"=="production" (
    if exist "docker-compose.prod.yml" (
        set COMPOSE_FILES=!COMPOSE_FILES! -f docker-compose.prod.yml
    )
) else if "%ENVIRONMENT%"=="prod" (
    if exist "docker-compose.prod.yml" (
        set COMPOSE_FILES=!COMPOSE_FILES! -f docker-compose.prod.yml
    )
) else if "%ENVIRONMENT%"=="staging" (
    if exist "docker-compose.staging.yml" (
        set COMPOSE_FILES=!COMPOSE_FILES! -f docker-compose.staging.yml
    )
)

call :print_status "Environment: %ENVIRONMENT%"
call :print_status "Command: %COMMAND%"

REM Execute commands
if "%COMMAND%"=="up" (
    call :print_status "Starting services..."
    docker-compose %COMPOSE_FILES% up %3 %4 %5 %6 %7 %8 %9
) else if "%COMMAND%"=="down" (
    call :print_status "Stopping services..."
    docker-compose %COMPOSE_FILES% down %3 %4 %5 %6 %7 %8 %9
) else if "%COMMAND%"=="build" (
    call :print_status "Building services..."
    docker-compose %COMPOSE_FILES% build %3 %4 %5 %6 %7 %8 %9
) else if "%COMMAND%"=="rebuild" (
    call :print_status "Rebuilding services from scratch..."
    docker-compose %COMPOSE_FILES% down
    docker-compose %COMPOSE_FILES% build --no-cache %3 %4 %5 %6 %7 %8 %9
    docker-compose %COMPOSE_FILES% up -d
) else if "%COMMAND%"=="logs" (
    docker-compose %COMPOSE_FILES% logs %3 %4 %5 %6 %7 %8 %9
) else if "%COMMAND%"=="ps" (
    docker-compose %COMPOSE_FILES% ps %3 %4 %5 %6 %7 %8 %9
) else if "%COMMAND%"=="exec" (
    if "%3"=="" (
        call :print_error "Usage: %0 %ENVIRONMENT% exec <service> <command>"
        exit /b 1
    )
    docker-compose %COMPOSE_FILES% exec %3 %4 %5 %6 %7 %8 %9
) else if "%COMMAND%"=="shell" (
    if "%3"=="" (
        call :print_error "Usage: %0 %ENVIRONMENT% shell <service>"
        exit /b 1
    )
    docker-compose %COMPOSE_FILES% exec %3 /bin/sh
) else if "%COMMAND%"=="clean" (
    call :print_warning "This will remove all containers, networks, and volumes for this project."
    set /p REPLY="Are you sure? (y/N): "
    if /i "!REPLY!"=="y" (
        docker-compose %COMPOSE_FILES% down -v --remove-orphans
        docker system prune -f
        call :print_success "Cleanup completed."
    ) else (
        call :print_status "Cleanup cancelled."
    )
) else if "%COMMAND%"=="help" (
    echo GeoQuiz Docker Compose Management Script
    echo.
    echo Usage: %0 [environment] [command] [options]
    echo.
    echo Environments:
    echo   development, dev    - Development environment (default)
    echo   production, prod    - Production environment
    echo   staging            - Staging environment
    echo.
    echo Commands:
    echo   up                 - Start services (default)
    echo   down               - Stop and remove services
    echo   build              - Build services
    echo   rebuild            - Rebuild services from scratch
    echo   logs               - Show service logs
    echo   ps                 - Show running services
    echo   exec               - Execute command in service
    echo   shell              - Open shell in service
    echo   clean              - Clean up containers, networks, and volumes
    echo   help               - Show this help message
) else (
    call :print_error "Unknown command: %COMMAND%"
    exit /b 1
)

endlocal