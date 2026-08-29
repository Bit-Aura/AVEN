import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.bkt_engine import update_bkt_score

@pytest.mark.asyncio
@patch('app.services.bkt_engine.get_skill_bkt_params')
async def test_bkt_engine_responses(mock_get_params):
    mock_get_params.return_value = {
        "p_l0": 0.15,
        "p_t": 0.20,
        "p_s": 0.10,
        "p_g": 0.20
    }
    
    mock_db = AsyncMock()
    
    # Mocking select() to return no snapshot so it uses priors, or we can just mock get_skill_bkt_params directly if possible,
    # but since it's an integration-like test, we'll mock the execute result.
    
    # Actually, we can just mock the ReadinessSnapshot state.
    class MockSnapshot:
        def __init__(self, score):
            self.readiness_score = score
            self.skill_id = "test_skill"
            self.profile_id = 1
            
    # Mocking the execute for ReadinessSnapshot
    mock_result = MagicMock()
    mock_result.scalars().first.return_value = None
    mock_db.execute.return_value = mock_result
    
    # We will simulate 3 correct answers
    p_initial = 0.15 # default
    current_p = p_initial
    
    for _ in range(3):
        # We need to mock the db.execute to return the current snapshot state
        mock_snapshot = MockSnapshot(current_p)
        mock_result.scalars().first.return_value = mock_snapshot
        
        current_p = await update_bkt_score(1, "test_skill", True, mock_db)
        
    assert current_p > p_initial, "Three correct answers should increase probability of mastery"
    
    # We will simulate 3 incorrect answers
    p_initial = 0.85
    current_p = p_initial
    
    for _ in range(3):
        mock_snapshot = MockSnapshot(current_p)
        mock_result.scalars().first.return_value = mock_snapshot
        
        current_p = await update_bkt_score(1, "test_skill", False, mock_db)
        
    assert current_p < p_initial, "Three incorrect answers should decrease probability of mastery"
