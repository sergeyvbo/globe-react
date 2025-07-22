#!/bin/bash

# Test script for Docker Compose configuration validation
# This script validates Docker Compose configurations for all environments

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to test Docker Compose configuration
test_compose_config() {
    local env=$1
    local compose_files=""
    
    print_status "Testing $env environment configuration..."
    
    # Load environment variables
    if [ -f "../environments/${env}.env" ]; then
        export $(grep -v '^#' "../environments/${env}.env" | xargs)
    fi
    
    # Set compose files based on environment
    case $env in
        "development")
            compose_files="-f docker-compose.yml -f docker-compose.override.yml"
            ;;
        "staging")
            compose_files="-f docker-compose.yml -f docker-compose.staging.yml"
            ;;
        "production")
            compose_files="-f docker-compose.yml -f docker-compose.prod.yml"
            ;;
        *)
            compose_files="-f docker-compose.yml"
            ;;
    esac
    
    # Test configuration syntax
    if docker-compose $compose_files config > /dev/null 2>&1; then
        print_success "$env configuration is valid"
        
        # Test service definitions
        local services=$(docker-compose $compose_files config --services)
        print_status "Services in $env: $services"
        
        # Test port mappings
        local ports=$(docker-compose $compose_files config | grep -E "^\s*-\s*\"[0-9]+:[0-9]+\"" | sort | uniq)
        if [ ! -z "$ports" ]; then
            print_status "Port mappings in $env:"
            echo "$ports" | sed 's/^/  /'
        fi
        
        # Test volume definitions
        local volumes=$(docker-compose $compose_files config --volumes)
        if [ ! -z "$volumes" ]; then
            print_status "Volumes in $env: $volumes"
        fi
        
        # Test network definitions
        local networks=$(docker-compose $compose_files config | grep -A 5 "^networks:" | grep -E "^\s+[a-zA-Z]" | awk '{print $1}' | sed 's/:$//')
        if [ ! -z "$networks" ]; then
            print_status "Networks in $env: $networks"
        fi
        
        return 0
    else
        print_error "$env configuration has errors:"
        docker-compose $compose_files config 2>&1 | sed 's/^/  /'
        return 1
    fi
}

# Function to test environment variable injection
test_env_injection() {
    local env=$1
    
    print_status "Testing environment variable injection for $env..."
    
    if [ -f "../environments/${env}.env" ]; then
        # Check for required variables
        local required_vars=("DB_NAME" "DB_USER" "FRONTEND_PORT" "BACKEND_PORT")
        local missing_vars=()
        
        for var in "${required_vars[@]}"; do
            if ! grep -q "^${var}=" "../environments/${env}.env"; then
                missing_vars+=("$var")
            fi
        done
        
        if [ ${#missing_vars[@]} -eq 0 ]; then
            print_success "All required environment variables are present in $env"
        else
            print_warning "Missing environment variables in $env: ${missing_vars[*]}"
        fi
        
        # Check for environment-specific ports
        local frontend_port=$(grep "^FRONTEND_PORT=" "../environments/${env}.env" | cut -d'=' -f2)
        local backend_port=$(grep "^BACKEND_PORT=" "../environments/${env}.env" | cut -d'=' -f2)
        
        print_status "$env ports - Frontend: $frontend_port, Backend: $backend_port"
        
    else
        print_error "Environment file ../environments/${env}.env not found"
        return 1
    fi
}

# Function to test service discovery
test_service_discovery() {
    local env=$1
    
    print_status "Testing service discovery configuration for $env..."
    
    # Load environment and test compose config
    if [ -f "../environments/${env}.env" ]; then
        export $(grep -v '^#' "../environments/${env}.env" | xargs)
    fi
    
    local compose_files=""
    case $env in
        "development")
            compose_files="-f docker-compose.yml -f docker-compose.override.yml"
            ;;
        "staging")
            compose_files="-f docker-compose.yml -f docker-compose.staging.yml"
            ;;
        "production")
            compose_files="-f docker-compose.yml -f docker-compose.prod.yml"
            ;;
        *)
            compose_files="-f docker-compose.yml"
            ;;
    esac
    
    # Check if services can discover each other
    local config_output=$(docker-compose $compose_files config 2>/dev/null)
    
    # Check database connection string
    if echo "$config_output" | grep -q "Host=database"; then
        print_success "$env: Backend can discover database service"
    else
        print_error "$env: Backend cannot discover database service"
    fi
    
    # Check frontend to backend connection
    if echo "$config_output" | grep -q "backend:5000"; then
        print_success "$env: Frontend can discover backend service"
    else
        print_warning "$env: Frontend may not be configured to discover backend service"
    fi
}

# Main test function
main() {
    print_status "Starting Docker Compose configuration tests..."
    
    # Check if Docker is available
    if ! command -v docker-compose &> /dev/null; then
        print_error "docker-compose is not installed or not in PATH"
        exit 1
    fi
    
    local environments=("development" "staging" "production")
    local failed_tests=0
    
    for env in "${environments[@]}"; do
        echo
        print_status "=== Testing $env environment ==="
        
        if ! test_compose_config "$env"; then
            ((failed_tests++))
        fi
        
        if ! test_env_injection "$env"; then
            ((failed_tests++))
        fi
        
        test_service_discovery "$env"
    done
    
    echo
    if [ $failed_tests -eq 0 ]; then
        print_success "All configuration tests passed!"
        exit 0
    else
        print_error "$failed_tests test(s) failed"
        exit 1
    fi
}

# Run main function
main "$@"