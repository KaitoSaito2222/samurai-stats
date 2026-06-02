.PHONY: up down logs reset migrate seed shell-db shell-backend

# Start all services (first run: builds images and initialises DB)
up:
	docker compose --env-file .env.local up --build -d
	@./scripts/seed-local.sh

# Stop all services (preserves pgdata volume)
down:
	docker compose down

# Tail logs for all services (Ctrl-C to exit)
logs:
	docker compose logs -f

# Tear down everything including the DB volume, then rebuild and seed from scratch
reset:
	docker compose down -v
	docker compose --env-file .env.local up --build -d
	@./scripts/seed-local.sh

# Seed local data without restarting services (backend must already be running)
seed:
	@./scripts/seed-local.sh

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
