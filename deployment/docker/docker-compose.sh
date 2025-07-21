#!/bin/bash

# Docker Compose management script for GeoQuiz application
# Usage: ./docker-compose.sh [environment] [command]

set -e

# Default values
ENVIRONMENT=${1:-development}
COMMAND=${2:-up}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to check if required files exist
check_files() {
    local env_file=".env"
    
    if [ ! -f "$env_file" ]; then
        print_warning "Environment file $env_file not found."
        if [ -f ".env.example" ]; then
            print_status "Copying .env.example to $env_file"
            cp .env.example "$env_file"
            print_warning "Please update the values in $env_file before running again."
            exit 1
        else
            print_error "No environment file template found."
            exit 1
        fi
    fi
}

# Function to get Docker Compose files based on environment
get_compose_files() {
    local base_file="docker-compose.yml"
    local files="-f $base_file"
    
    case $ENVIRONMENT in
        "development"|"dev")
            if [ -f "docker-compose.override.yml" ]; then
                files="$files -f docker-compose.override.yml"
            fi
            ;;
        "production"|"prod")
            if [ -f "docker-compose.prod.yml" ]; then
                files="$files -f docker-compose.prod.yml"
            fi
            ;;
        "staging")
            if [ -f "docker-compose.staging.yml" ]; then
                files="$files -f docker-compose.staging.yml"
            fi
            ;;
        *)
            print_warning "Unknown environment: $ENVIRONMENT. Using base configuration."
            ;;
    esac
    
    echo "$files"
}

# Function to run Docker Compose command
run_compose() {
    local compose_files=$(get_compose_files)
    local full_command="docker-compose $compose_files $*"
    
    print_status "Running: $full_command"
    eval $full_command
}

# Function to show help
show_help() {
    echo "GeoQuiz Docker Compose Management Script"
    echo ""
    echo "Usage: $0 [environment] [command] [options]"
    echo ""
    echo "Environments:"
    echo "  development, dev    - Development environment (default)"
    echo "  production, prod    - Production environment"
    echo "  staging            - Staging environment"
    echo ""
    echo "Commands:"
    echo "  up                 - Start services (default)"
    echo "  down               - Stop and remove services"
    echo "  build              - Build services"
    echo "  rebuild            - Rebuild services from scratch"
    echo "  logs               - Show service logs"
    echo "  ps                 - Show running services"
    echo "  exec               - Execute command in service"
    echo "  shell              - Open shell in service"
    echo "  clean              - Clean up containers, networks, and volumes"
    echo "  help               - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 development up -d           # Start development environment in background"
    echo "  $0 production build            # Build production images"
    echo "  $0 dev logs backend            # Show backend logs in development"
    echo "  $0 prod exec backend bash      # Open bash shell in production backend"
    echo "  $0 development clean           # Clean up development environment"
}

# Main script logic
main() {
    cd "$SCRIPT_DIR"
    
    # Handle help command
    if [ "$1" = "help" ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
        show_help
        exit 0
    fi
    
    # Check prerequisites
    check_docker
    check_files
    
    print_status "Environment: $ENVIRONMENT"
    print_status "Command: $COMMAND"
    
    case $COMMAND in
        "up")
            run_compose up "${@:3}"
            ;;
        "down")
            run_compose down "${@:3}"
            ;;
        "build")
            run_compose build "${@:3}"
            ;;
        "rebuild")
            print_status "Rebuilding services from scratch..."
            run_compose down
            run_compose build --no-cache "${@:3}"
            run_compose up -d
            ;;
        "logs")
            run_compose logs "${@:3}"
            ;;
        "ps")
            run_compose ps "${@:3}"
            ;;
        "exec")
            if [ $# -lt 3 ]; then
                print_error "Usage: $0 $ENVIRONMENT exec <service> <command>"
                exit 1
            fi
            run_compose exec "${@:3}"
            ;;
        "shell")
            if [ $# -lt 3 ]; then
                print_error "Usage: $0 $ENVIRONMENT shell <service>"
                exit 1
            fi
            run_compose exec "${3}" /bin/sh
            ;;
        "clean")
            print_warning "This will remove all containers, networks, and volumes for this project."
            read -p "Are you sure? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                run_compose down -v --remove-orphans
                docker system prune -f
                print_success "Cleanup completed."
            else
                print_status "Cleanup cancelled."
            fi
            ;;
        *)
            print_error "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"