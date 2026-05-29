.PHONY: up down logs reset migrate shell-db shell-backend

# Start all services (first run: builds images and initialises DB)
up:
	docker compose --env-file .env.local up --build -d
	@echo ""
	@echo "  Services:"
	@echo "    Frontend  → http://localhost:3000"
	@echo "    Backend   → http://localhost:8000"
	@echo "    Supabase  → http://localhost:8080  (auth + rest proxy)"
	@echo "    DB        → postgresql://postgres:localpassword@localhost:5432/postgres"
	@echo ""
	@echo "  Run 'make logs' to tail all logs."

# Stop all services (preserves pgdata volume)
down:
	docker compose down

# Tail logs for all services (Ctrl-C to exit)
logs:
	docker compose logs -f

# Tear down everything including the DB volume, then rebuild from scratch
reset:
	docker compose down -v
	docker compose --env-file .env.local up --build -d

# Re-run migrations manually (useful after adding a new migration file)
migrate:
	@for f in $$(ls supabase/migrations/*.sql | sort); do \
	  echo "Applying $$f..."; \
	  docker compose exec -T db psql -U postgres -f /docker-entrypoint-initdb.d/$$(basename $$f); \
	done

# Open a psql shell inside the DB container
shell-db:
	docker compose exec db psql -U postgres

# Open a bash shell inside the backend container
shell-backend:
	docker compose exec backend bash
