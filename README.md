# Career PathFinder

An AI-powered personalized learning path recommender.

## Architecture

This is a monorepo containing:
- **Backend (`apps/api`)**: FastAPI application, async SQLAlchemy, PostgreSQL with pgvector, NetworkX for graph traversal, and direct Anthropic SDK calls for LLM integration.
- **Frontend (`apps/web`)**: React 18 + TypeScript + Vite, Tailwind CSS, TanStack Query, and Zustand.
- **Shared Types (`packages/shared-types`)**: OpenAPI-generated TypeScript types shared across the stack.

## Pipeline Architecture

The application is structured around a 3-phase pipeline:
1. **Offline setup**: Skill graph construction and embeddings generation using `sentence-transformers` and pgvector.
2. **Runtime pipeline**: Intent parsing -> Semantic mapping -> Graph traversal -> Ranking -> Explainer.
3. **Feedback loop**: Background workers adjust weights and trigger re-ranking based on user feedback.

## Local Dev Setup

1. Copy `.env.example` to `.env` and fill in the required values:
   ```bash
   cp .env.example .env
   ```
2. Start the services using Docker Compose:
   ```bash
   docker-compose up --build
   ```
3. Run the initial database migrations:
   ```bash
   # Wait for the database to be up, then run:
   docker-compose exec api alembic upgrade head
   ```

The API will be available at `http://localhost:8000` and the web frontend at `http://localhost:8080`.
