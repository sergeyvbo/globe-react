#!/bin/bash

# Test script for service connectivity and networking
# This script tests if services can communicate with each other

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

# Function to test service connectivity
test_connectivity() {
    local env=$1
    local compose_files=""
    
    print_status "Testing service connectivity for $env environment..."
    
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
    
    # Start services in detached mode
    print_status "Starting services for connectivity test..."
    if docker-compose $compose_files up -d --build; then
        print_success "Services started successfully"
    else
        print_error "Failed to start services"
        return 1
    fi
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Test database connectivity from backend
    print_status "Testing database connectivity from backend..."
    if docker-compose $compose_files exec -T backend sh -c "nc -z database 5432"; then
        print_success "Backend can connect to database"
    else
        print_error "Backend cannot connect to database"
    fi
    
    # Test backend connectivity from frontend
    print_status "Testing backend connectivity from frontend..."
    if docker-compose $compose_files exec -T frontend sh -c "nc -z backend 5000"; then
        print_success "Frontend can connect to backend"
    else
        print_error "Frontend cannot connect to backend"
    fi
    
    # Test external port accessibility
    local frontend_port
    case $env in
        "staging")
            frontend_port="6666"
            ;;
        "production")
            frontend_port="6666"
            ;;
        *)
            frontend_port="3000"
            ;;
    esac
    
    print_status "Testing external port accessibility on port $frontend_port..."
    if curl -f -s "http://localhost:$frontend_port/health" > /dev/null; then
        print_success "Frontend is accessible on port $frontend_port"
    else
        print_warning "Frontend may not be accessible on port $frontend_port (this is normal if health endpoint is not implemented)"
    fi
    
    # Test API endpoint
    local backend_port
    case $env in
        "staging")
            backend_port="5001"
            ;;
        *)
            backend_port="5000"
            ;;
    esac
    
    print_status "Testing API endpoint accessibility on port $backend_port..."
    if curl -f -s "http://localhost:$backend_port/health" > /dev/null; then
        print_success "Backend API is accessible on port $backend_port"
    else
        print_warning "Backend API may not be accessible on port $backend_port (this is normal if health endpoint is not implemented)"
    fi
    
    # Show running services
    print_status "Currently running services:"
    docker-compose $compose_files ps
    
    # Cleanup
    print_status "Stopping test services..."
    docker-compose $compose_files down
    
    return 0
}

# Function to test volume mounts
test_volumes() {
    local env=$1
    
    print_status "Testing volume mounts for $env environment..."
    
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
    
    # Check volume definitions
    local volumes=$(docker-compose $compose_files config --volumes)
    if [ ! -z "$volumes" ]; then
        print_success "Volume definitions found for $env:"
        echo "$volumes" | sed 's/^/  /'
        
        # Test if volumes are properly configured for persistence
        if echo "$volumes" | grep -q "postgres.*data"; then
            print_success "Database persistence volume configured"
        else
            print_warning "Database persistence volume may not be configured"
        fi
        
        if echo "$volumes" | grep -q "backend.*logs"; then
            print_success "Backend logs volume configured"
        else
            print_warning "Backend logs volume may not be configured"
        fi
        
    else
        print_warning "No volumes defined for $env environment"
    fi
}

# Main function
main() {
    local env=${1:-staging}
    
    print_status "Starting service connectivity tests for $env environment..."
    
    # Check prerequisites
    if ! command -v docker-compose &> /dev/null; then
        print_error "docker-compose is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        print_error "curl is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    echo
    test_volumes "$env"
    
    echo
    if test_connectivity "$env"; then
        print_success "Service connectivity tests completed for $env"
    else
        print_error "Service connectivity tests failed for $env"
        exit 1
    fi
}

# Show help if requested
if [ "$1" = "help" ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "Service Connectivity Test Script"
    echo ""
    echo "Usage: $0 [environment]"
    echo ""
    echo "Environments:"
    echo "  development    - Development environment"
    echo "  staging        - Staging environment (default)"
    echo "  production     - Production environment"
    echo ""
    echo "This script tests:"
    echo "  - Service-to-service connectivity"
    echo "  - External port accessibility"
    echo "  - Volume mount configurations"
    echo "  - Network configuration"
    exit 0
fi

# Run main function
main "$@"