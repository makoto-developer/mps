.PHONY: help install build generate deploy clean docker-build docker-up docker-down test

# Variables
DSL_FILE ?= examples/minimal-test.dsl
OUTPUT_DIR ?= generated
APP_PORT ?= 3000

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)Drawing App DSL - Available Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Usage Examples:$(NC)"
	@echo "  make setup              # Install dependencies and build"
	@echo "  make generate           # Generate code from DSL"
	@echo "  make deploy             # Full deployment (generate + setup + migrate + start)"
	@echo "  make docker-deploy      # Deploy using Docker"
	@echo ""
	@echo "$(YELLOW)Custom DSL file:$(NC)"
	@echo "  make generate DSL_FILE=examples/my-app.dsl OUTPUT_DIR=my-output"
	@echo ""

install: ## Install dependencies
	@echo "$(BLUE)📦 Installing dependencies...$(NC)"
	npm install
	@echo "$(GREEN)✅ Dependencies installed$(NC)"

build: ## Build TypeScript code
	@echo "$(BLUE)🔨 Building TypeScript...$(NC)"
	npm run build
	@echo "$(GREEN)✅ Build completed$(NC)"

setup: install build ## Setup project (install + build)
	@echo "$(GREEN)✅ Setup completed$(NC)"

generate: build ## Generate code from DSL file
	@echo "$(BLUE)⚙️  Generating code from $(DSL_FILE)...$(NC)"
	node dist/cli/index.js generate $(DSL_FILE) -o $(OUTPUT_DIR)
	@echo "$(GREEN)✅ Code generated to $(OUTPUT_DIR)$(NC)"

deploy-setup: generate ## Setup generated project
	@echo "$(BLUE)📦 Installing dependencies for generated project...$(NC)"
	cd $(OUTPUT_DIR) && npm install
	@if [ ! -f $(OUTPUT_DIR)/.env ]; then \
		echo "$(YELLOW)⚠️  Creating .env file from .env.example$(NC)"; \
		cp $(OUTPUT_DIR)/.env.example $(OUTPUT_DIR)/.env; \
		echo "$(RED)❗ Please edit $(OUTPUT_DIR)/.env and set DATABASE_URL and JWT_SECRET$(NC)"; \
	fi
	@echo "$(GREEN)✅ Generated project setup completed$(NC)"

migrate: ## Run database migrations
	@if [ ! -f $(OUTPUT_DIR)/.env ]; then \
		echo "$(RED)❌ .env file not found. Please create it first.$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)🗄️  Running database migrations...$(NC)"
	cd $(OUTPUT_DIR) && npx prisma generate
	cd $(OUTPUT_DIR) && npx prisma migrate dev --name init
	@echo "$(GREEN)✅ Migrations completed$(NC)"

start: ## Start the generated application
	@echo "$(BLUE)🚀 Starting application on port $(APP_PORT)...$(NC)"
	cd $(OUTPUT_DIR) && npm run dev

start-prod: ## Start the generated application in production mode
	@echo "$(BLUE)🚀 Starting application in production mode...$(NC)"
	cd $(OUTPUT_DIR) && npm run build && npm start

deploy: generate deploy-setup ## Full deployment (generate + setup)
	@echo "$(GREEN)✅ Deployment completed!$(NC)"
	@echo ""
	@echo "$(YELLOW)📝 Next steps:$(NC)"
	@echo "  1. Edit $(OUTPUT_DIR)/.env and set your DATABASE_URL and JWT_SECRET"
	@echo "  2. Run: make migrate"
	@echo "  3. Run: make start"
	@echo ""

full-deploy: deploy migrate start ## Complete deployment with migrations and start
	@echo "$(GREEN)✅ Full deployment completed!$(NC)"

clean: ## Clean generated files and build artifacts
	@echo "$(BLUE)🧹 Cleaning...$(NC)"
	rm -rf $(OUTPUT_DIR)
	rm -rf dist
	rm -rf node_modules
	@echo "$(GREEN)✅ Cleaned$(NC)"

clean-generated: ## Clean only generated files
	@echo "$(BLUE)🧹 Cleaning generated files...$(NC)"
	rm -rf $(OUTPUT_DIR)
	@echo "$(GREEN)✅ Generated files cleaned$(NC)"

test: ## Run tests
	@echo "$(BLUE)🧪 Running tests...$(NC)"
	npm test
	@echo "$(GREEN)✅ Tests completed$(NC)"

lint: ## Run linter
	@echo "$(BLUE)🔍 Running linter...$(NC)"
	npm run lint
	@echo "$(GREEN)✅ Linting completed$(NC)"

# Docker commands
docker-build: ## Build Docker image
	@echo "$(BLUE)🐳 Building Docker image...$(NC)"
	docker build -t drawing-app-dsl:latest .
	@echo "$(GREEN)✅ Docker image built$(NC)"

docker-generate: docker-build ## Generate code using Docker
	@echo "$(BLUE)🐳 Generating code using Docker...$(NC)"
	docker run --rm -v $(PWD)/examples:/app/examples -v $(PWD)/$(OUTPUT_DIR):/app/$(OUTPUT_DIR) \
		drawing-app-dsl:latest generate $(DSL_FILE) -o $(OUTPUT_DIR)
	@echo "$(GREEN)✅ Code generated using Docker$(NC)"

docker-up: ## Start services with docker-compose
	@echo "$(BLUE)🐳 Starting Docker services...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✅ Docker services started$(NC)"

docker-down: ## Stop Docker services
	@echo "$(BLUE)🐳 Stopping Docker services...$(NC)"
	docker-compose down
	@echo "$(GREEN)✅ Docker services stopped$(NC)"

docker-logs: ## Show Docker logs
	docker-compose logs -f

docker-deploy: docker-generate docker-up ## Full Docker deployment
	@echo "$(GREEN)✅ Docker deployment completed!$(NC)"

# Development helpers
dev-watch: ## Watch mode for development
	@echo "$(BLUE)👀 Starting watch mode...$(NC)"
	npm run dev

format: ## Format code
	@echo "$(BLUE)✨ Formatting code...$(NC)"
	npx prettier --write "src/**/*.ts"
	@echo "$(GREEN)✅ Code formatted$(NC)"

# Example commands
example-simple: ## Generate from simple example
	@$(MAKE) generate DSL_FILE=examples/minimal-test.dsl OUTPUT_DIR=generated-simple

example-full: ## Generate from full example
	@$(MAKE) generate DSL_FILE=examples/drawing-app-example.dsl OUTPUT_DIR=generated-full

# Info commands
version: ## Show version
	@echo "Drawing App DSL v0.1.0"

status: ## Show project status
	@echo "$(BLUE)📊 Project Status$(NC)"
	@echo ""
	@echo "DSL File: $(DSL_FILE)"
	@echo "Output Directory: $(OUTPUT_DIR)"
	@if [ -d $(OUTPUT_DIR) ]; then \
		echo "Generated: $(GREEN)Yes$(NC)"; \
	else \
		echo "Generated: $(RED)No$(NC)"; \
	fi
	@if [ -f dist/cli/index.js ]; then \
		echo "Built: $(GREEN)Yes$(NC)"; \
	else \
		echo "Built: $(RED)No$(NC)"; \
	fi
	@echo ""

# Quick start
quickstart: setup generate deploy-setup ## Quick start (setup + generate + deploy-setup)
	@echo "$(GREEN)✅ Quick start completed!$(NC)"
	@echo ""
	@echo "$(YELLOW)📝 Next steps:$(NC)"
	@echo "  1. Edit $(OUTPUT_DIR)/.env"
	@echo "  2. make migrate"
	@echo "  3. make start"
	@echo ""
