 .PHONY: run backend frontend

run:
	@echo "Starting backend and frontend (Ctrl+C to stop)..."
	@trap 'kill 0' INT TERM; \
	( cd backend && uv run uvicorn main:app --reload --port 8000 ) & \
	( cd frontend && npm run dev ) & \
	wait

backend:
	cd backend && source .venv/bin/activate && uvicorn main:app --reload --port 8000

frontend:
	cd frontend && npm run dev
