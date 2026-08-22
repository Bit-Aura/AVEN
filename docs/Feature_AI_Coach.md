# Feature: AI Coach "Help Me" Overlay

## Overview
Learning complex topics inevitably leads to moments of confusion. Instead of letting users abandon their path to search for answers on Stack Overflow, we've implemented Surya's tenth MVP feature: the **AI Coach Overlay**. This brings a personalized, context-aware tutor directly into the learning experience.

## Capabilities Delivered
- **Context-Aware Trigger**: Added a "🤖 Need Help" button directly to the `MilestoneCard`. Clicking it opens the coach specifically for that learning node.
- **Socratic Chat Drawer**: Built `AiCoachDrawer.tsx`, a sleek chat interface that slides in from the right edge of the screen.
- **Smart Seeding**: When opened, the coach immediately recognizes the user's current context (e.g., "I see you're working on 'Setup Basic Express Server'. What specific part is confusing you?").
- **Mocked Interaction Flow**: Implemented a responsive chat UI with auto-scrolling and mocked AI responses to simulate a step-by-step tutoring session. (The real LLM backend integration will be handled subsequently by Sriram).

## Quality Assurance
- **Optimized Commit Strategy**: Maintained our standard by grouping the store logic, the new chat UI, and the integration into a single feature commit (`feat(coach): implement AI Coach drawer and state integration`).
- **Pristine Environment**: Zero test or benchmark files lingered in the workspace (Rule 7).

PathFinder just became significantly more supportive and interactive!
