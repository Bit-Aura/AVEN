from typing import Dict, Any, List

class AISimulationService:
    @staticmethod
    def generate_stakeholder_response(ticket_id: str, user_message: str) -> Dict[str, Any]:
        """
        Mocks a response from the AI Product Manager/Client based on the user's question.
        In a real scenario, this would call an LLM with the ticket context.
        """
        # A simple keyword-based mock for demonstration
        message_lower = user_message.lower()
        if "requirement" in message_lower or "detail" in message_lower:
            response_text = "The requirement is to ensure the UI is responsive and passes all accessibility tests. Let me know if you need more specifics."
        elif "deadline" in message_lower:
            response_text = "We need this by end of week. Can you make it?"
        else:
            response_text = "That's a good question. Proceed with best practices and we can iterate during the PR."
            
        return {
            "role": "stakeholder",
            "content": response_text
        }

    @staticmethod
    def generate_mock_pr_review(code_diff: str) -> Dict[str, Any]:
        """
        Mocks a PR review from the AI Senior Developer.
        """
        # Return mock inline comments based on simple checks
        comments = []
        if "console.log" in code_diff:
            comments.append({
                "line": 0, # mock line
                "message": "Please remove console.log statements before merging."
            })
        
        status = "approved" if len(comments) == 0 else "changes_requested"
        
        return {
            "status": status,
            "comments": comments,
            "summary": "Overall looks good, but please address the comments." if comments else "Great job! LGTM."
        }
