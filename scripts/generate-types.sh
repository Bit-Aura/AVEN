#!/bin/bash
set -e

# Directory configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="$PROJECT_ROOT/packages/shared-types"
OUTPUT_FILE="$OUTPUT_DIR/index.d.ts"

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

echo "Generating OpenAPI schema from FastAPI application..."
DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/career_pathfinder" \
ANTHROPIC_API_KEY="mock-api-key" \
NEO4J_URI="bolt://localhost:7687" \
NEO4J_USERNAME="neo4j" \
NEO4J_PASSWORD="password" \
PYTHONPATH="$PROJECT_ROOT/apps/api" \
"$PROJECT_ROOT/.venv/bin/python" -c "
import json
from app.main import app
print(json.dumps(app.openapi()))
" > "$PROJECT_ROOT/openapi.json"

echo "Generating TypeScript types from OpenAPI schema..."
npx --yes openapi-typescript "$PROJECT_ROOT/openapi.json" --output "$OUTPUT_FILE"

# Clean up temporary JSON schema
rm "$PROJECT_ROOT/openapi.json"

echo "TypeScript models successfully generated at $OUTPUT_FILE!"
