from typing import List, Optional, Any
from datetime import datetime
from sqlalchemy import String, ForeignKey, Text, DateTime, Integer, Boolean, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from .base import Base

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    clerk_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    role: Mapped[str] = mapped_column(String(50), default="user")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    profile: Mapped[Optional["LearnerProfile"]] = relationship(back_populates="user", uselist=False)
    mentor_applications: Mapped[List["MentorApplication"]] = relationship(back_populates="user")
    submitted_resources: Mapped[List["Resource"]] = relationship(back_populates="submitted_by_user")

class MentorApplication(Base):
    __tablename__ = "mentor_applications"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(255))
    expertise: Mapped[str] = mapped_column(String(255))
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="PENDING") # PENDING, APPROVED, REJECTED
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    user: Mapped["User"] = relationship(back_populates="mentor_applications")

class LearnerProfile(Base):
    __tablename__ = "learner_profiles"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    current_context: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    user: Mapped["User"] = relationship(back_populates="profile")
    goals: Mapped[List["Goal"]] = relationship(back_populates="profile")
    diagnostic_sessions: Mapped[List["DiagnosticSession"]] = relationship(back_populates="profile")
    assessment_attempts: Mapped[List["AssessmentAttempt"]] = relationship(back_populates="profile")
    path_versions: Mapped[List["PathVersion"]] = relationship(back_populates="profile")
    readiness_snapshots: Mapped[List["ReadinessSnapshot"]] = relationship(back_populates="profile")

class Goal(Base):
    __tablename__ = "goals"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("learner_profiles.id"))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(384))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    profile: Mapped["LearnerProfile"] = relationship(back_populates="goals")

class DiagnosticSession(Base):
    __tablename__ = "diagnostic_sessions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("learner_profiles.id"))
    status: Mapped[str] = mapped_column(String(50), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    profile: Mapped["LearnerProfile"] = relationship(back_populates="diagnostic_sessions")
    turns: Mapped[List["DiagnosticTurn"]] = relationship(back_populates="session")

class DiagnosticTurn(Base):
    __tablename__ = "diagnostic_turns"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("diagnostic_sessions.id"))
    prompt: Mapped[str] = mapped_column(Text)
    response: Mapped[Optional[str]] = mapped_column(Text)
    turn_number: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    session: Mapped["DiagnosticSession"] = relationship(back_populates="turns")

class AssessmentItem(Base):
    __tablename__ = "assessment_items"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text)
    difficulty: Mapped[str] = mapped_column(String(50))
    embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(384))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    attempts: Mapped[List["AssessmentAttempt"]] = relationship(back_populates="assessment_item")

class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("learner_profiles.id"))
    assessment_item_id: Mapped[int] = mapped_column(ForeignKey("assessment_items.id"))
    score: Mapped[float] = mapped_column(Float)
    is_correct: Mapped[bool] = mapped_column(Boolean)
    response_data: Mapped[Optional[str]] = mapped_column(Text)
    attempted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    profile: Mapped["LearnerProfile"] = relationship(back_populates="assessment_attempts")
    assessment_item: Mapped["AssessmentItem"] = relationship(back_populates="attempts")

class PathVersion(Base):
    __tablename__ = "path_versions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("learner_profiles.id"))
    parent_version_id: Mapped[Optional[int]] = mapped_column(ForeignKey("path_versions.id"), nullable=True)
    trigger_event: Mapped[str] = mapped_column(String(255))
    changed_nodes: Mapped[Any] = mapped_column(JSON) # JSON field for changed nodes
    decision_trace: Mapped[Any] = mapped_column(JSON) # JSON field for decision trace
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    profile: Mapped["LearnerProfile"] = relationship(back_populates="path_versions")

class ReadinessSnapshot(Base):
    __tablename__ = "readiness_snapshots"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("learner_profiles.id"))
    skill_id: Mapped[str] = mapped_column(String(255)) # reference to Neo4j Skill node by name/ID
    readiness_score: Mapped[float] = mapped_column(Float)
    last_updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    profile: Mapped["LearnerProfile"] = relationship(back_populates="readiness_snapshots")

class Resource(Base):
    __tablename__ = "resources"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text)
    url: Mapped[str] = mapped_column(String(512))
    resource_type: Mapped[str] = mapped_column(String(50), default="tutorial") # course, tutorial, video, article, project, documentation, practice
    skill_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    submitted_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="APPROVED") # PENDING, APPROVED, REJECTED
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(384))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    metadata_relations: Mapped[List["ResourceMetadata"]] = relationship(back_populates="resource", cascade="all, delete-orphan")
    submitted_by_user: Mapped[Optional["User"]] = relationship(back_populates="submitted_resources")

class ResourceMetadata(Base):
    __tablename__ = "resource_metadata"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    resource_id: Mapped[int] = mapped_column(ForeignKey("resources.id"))
    key: Mapped[str] = mapped_column(String(255))
    value: Mapped[str] = mapped_column(Text)
    
    resource: Mapped["Resource"] = relationship(back_populates="metadata_relations")

class FeedbackEvent(Base):
    __tablename__ = "feedback_events"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    target_type: Mapped[str] = mapped_column(String(50)) # e.g., 'resource', 'path_milestone'
    target_id: Mapped[int] = mapped_column(Integer)
    feedback_type: Mapped[str] = mapped_column(String(50)) # e.g., 'too_easy', 'too_hard', 'completed'
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class DomainEvent(Base):
    __tablename__ = "domain_events"
    
    event_id: Mapped[str] = mapped_column(String(255), primary_key=True) # event_id (UUID or unique string)
    event_type: Mapped[str] = mapped_column(String(255))
    aggregate_id: Mapped[str] = mapped_column(String(255))
    payload: Mapped[Any] = mapped_column(JSON)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class SkillRecord(Base):
    __tablename__ = "skills"
    
    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    bkt_p_l0: Mapped[float] = mapped_column(Float, default=0.15)
    bkt_p_t: Mapped[float] = mapped_column(Float, default=0.20)
    bkt_p_s: Mapped[float] = mapped_column(Float, default=0.10)
    bkt_p_g: Mapped[float] = mapped_column(Float, default=0.20)
    embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(384))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

