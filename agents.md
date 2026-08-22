# Agent Rules for AVEN / PathFinder

## Code Quality & Workflow Rules
1. **Code Quality is Paramount**: Write clean, modular, and maintainable code. Code quality is very important.
2. **Documentation per Feature**: A markdown documentation file must be created for each new feature. Documentation must be completely honest but positive—avoid critical/flagging language and stick to praising the implemented capabilities.
3. **Inline Comments**: Always write small, helpful inline comments to explain non-obvious logic throughout the codebase.
4. **Test-Driven Delivery**: You must write test files for every feature. The feature must be fully tested and verified before moving on to the next feature.
5. **Sequential Development**: Everything must be fully functioning and verified in one feature before jumping to the next. Do not leave features half-finished.
6. **Living README**: The common `README.md` must be updated continuously as new features are built and proven to work.
7. **Clean Test Environments**: Any benchmark, temporary, or mock files generated during testing must be automatically deleted after the test runs. Do not keep them locally or commit them to the repository, as this can trigger flagging.
8. **Meaningful & Frequent Commits**: Do not bundle everything into one giant commit. Make many meaningful, logically separated commits as you work through a feature.
9. **Strict Typing & Validation**: Rely on strict typing (Pydantic v2 in Python, strict TypeScript on the frontend). Never use ny or untyped dictionaries when schemas are available.
10. **Resilience & Fallbacks**: Any interaction with an external service or LLM must include error handling, timeouts, and safe fallback states so the app doesn't crash on an API failure.
11. **Security & Secrets**: Never log, hardcode, or commit secrets (API keys, DB credentials). Always use environment variables (.env) and maintain the .env.example file.
12. **Structured Logging**: Use structured JSON logging instead of plain print statements for observability, making debugging easier.
13. **Stick to the Tech Stack**: Do not arbitrarily introduce new libraries, databases, or frameworks. The tools defined in the architecture (FastAPI, Next.js, Neo4j, Postgres) are locked.
