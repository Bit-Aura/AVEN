from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON, func
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.models.base import Base

class P2PQueue(Base):
    __tablename__ = "p2p_queue"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    topic = Column(String, index=True, nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

class P2PSession(Base):
    __tablename__ = "p2p_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user1_id = Column(String, nullable=False)  # User who is interviewer first
    user2_id = Column(String, nullable=False)  # User who is candidate first
    topic = Column(String, nullable=False)
    status = Column(String, default="WAITING") # WAITING, IN_PROGRESS_1, SWAPPING, IN_PROGRESS_2, COMPLETED
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    question1_text = Column(Text, nullable=True)
    question1_solution = Column(Text, nullable=True)
    question2_text = Column(Text, nullable=True)
    question2_solution = Column(Text, nullable=True)
    
    # Store feedback as JSON for simplicity
    feedback_user1 = Column(JSON, nullable=True) # Feedback given BY user1 TO user2
    feedback_user2 = Column(JSON, nullable=True) # Feedback given BY user2 TO user1

class P2PQuestion(Base):
    __tablename__ = "p2p_questions"

    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String, index=True, nullable=False)
    difficulty = Column(String, default="Medium")
    question_text = Column(Text, nullable=False)
    solution_guidelines = Column(Text, nullable=False)
