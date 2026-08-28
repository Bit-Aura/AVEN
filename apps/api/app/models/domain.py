from typing import List, Optional, Any
from datetime import datetime
from sqlalchemy import String, ForeignKey, Text, DateTime, Integer, Boolean, Float, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from .base import Base

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    clerk_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, index=True, nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(50), default="LEARNER", index=True) # LEARNER, MENTOR, ADMIN
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    profile: Mapped[Optional["LearnerProfile"]] = relationship(back_populates="user", uselist=False)
    mentor_applications: Mapped[List["MentorApplication"]] = relationship(back_populates="user")
    submitted_resources: Mapped[List["Resource"]] = relationship(back_populates="submitted_by_user")
    conducted_interventions: Mapped[List["MentorIntervention"]] = relationship(back_populates="mentor")
    mentored_sessions: Mapped[List["MentorSessionRequest"]] = relationship(back_populates="mentor")

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
    last_known_weekly_hours: Mapped[float] = mapped_column(Float, default=10.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    user: Mapped["User"] = relationship(back_populates="profile")
    goals: Mapped[List["Goal"]] = relationship(back_populates="profile")
    diagnostic_sessions: Mapped[List["DiagnosticSession"]] = relationship(back_populates="profile")
    assessment_attempts: Mapped[List["AssessmentAttempt"]] = relationship(back_populates="profile")
    path_versions: Mapped[List["PathVersion"]] = relationship(back_populates="profile")
    readiness_snapshots: Mapped[List["ReadinessSnapshot"]] = relationship(back_populates="profile")
    coding_submissions: Mapped[List["CodingSandboxSubmission"]] = relationship(back_populates="profile")
    cohort_memberships: Mapped[List["CohortMember"]] = relationship(back_populates="profile")
    interventions: Mapped[List["MentorIntervention"]] = relationship(back_populates="profile")
    ai_escalations: Mapped[List["AiCoachEscalation"]] = relationship(back_populates="profile")
    mentor_session_requests: Mapped[List["MentorSessionRequest"]] = relationship(back_populates="profile")
    resumes: Mapped[List["LearnerResume"]] = relationship(back_populates="profile", cascade="all, delete-orphan")
    interview_sessions: Mapped[List["MockInterviewSession"]] = relationship(back_populates="profile", cascade="all, delete-orphan")

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
    source_roadmap_slug: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    source_node_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
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
    source: Mapped[str] = mapped_column(String(50), default="roadmap_sh", index=True) # manual, roadmap_sh
    roadmap_slug: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    external_node_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    deprecated: Mapped[bool] = mapped_column(Boolean, default=False)
    embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(384))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class RoadmapCache(Base):
    __tablename__ = "roadmap_cache"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    raw_detail_json: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    clean_nodes_json: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    topics_json: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    source_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    credits_spent: Mapped[int] = mapped_column(Integer, default=0)

class RoadmapIngestionConflict(Base):
    __tablename__ = "roadmap_ingestion_conflicts"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    conflict_type: Mapped[str] = mapped_column(String(50), index=True) # edge_mismatch, cycle_detected, unmapped_market_skill, partial_ingestion
    payload: Mapped[Any] = mapped_column(JSON)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class RoleRoadmapMapping(Base):
    __tablename__ = "role_roadmap_mappings"
    __table_args__ = (
        UniqueConstraint("role_id", "roadmap_slug", name="uq_role_roadmap_mapping"),
    )
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    role_id: Mapped[str] = mapped_column(String(100), index=True)
    roadmap_slug: Mapped[str] = mapped_column(String(255), index=True)
    priority_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class CodingSandboxSubmission(Base):
    __tablename__ = "coding_sandbox_submissions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[Optional[int]] = mapped_column(ForeignKey("learner_profiles.id"), nullable=True, index=True)
    node_id: Mapped[str] = mapped_column(String(255), index=True)
    question_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    problem_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    language: Mapped[str] = mapped_column(String(50))
    submitted_code: Mapped[str] = mapped_column(Text)
    score: Mapped[float] = mapped_column(Float)
    verdict: Mapped[str] = mapped_column(String(50))
    is_passing: Mapped[bool] = mapped_column(Boolean, default=False)
    evaluation_result: Mapped[Any] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    profile: Mapped[Optional["LearnerProfile"]] = relationship(back_populates="coding_submissions")

class Cohort(Base):
    __tablename__ = "cohorts"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    institution: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    members: Mapped[List["CohortMember"]] = relationship(back_populates="cohort", cascade="all, delete-orphan")
    placement_drives: Mapped[List["PlacementDrive"]] = relationship(back_populates="cohort")
    interventions: Mapped[List["MentorIntervention"]] = relationship(back_populates="cohort")

class CohortMember(Base):
    __tablename__ = "cohort_members"
    __table_args__ = (
        UniqueConstraint("cohort_id", "profile_id", name="uq_cohort_member"),
    )
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cohort_id: Mapped[int] = mapped_column(ForeignKey("cohorts.id", ondelete="CASCADE"), index=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("learner_profiles.id", ondelete="CASCADE"), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    cohort: Mapped["Cohort"] = relationship(back_populates="members")
    profile: Mapped["LearnerProfile"] = relationship(back_populates="cohort_memberships")

class PlacementDrive(Base):
    __tablename__ = "placement_drives"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cohort_id: Mapped[Optional[int]] = mapped_column(ForeignKey("cohorts.id", ondelete="SET NULL"), nullable=True, index=True)
    company_name: Mapped[str] = mapped_column(String(255), index=True)
    role_title: Mapped[str] = mapped_column(String(255))
    target_date: Mapped[str] = mapped_column(String(50)) # ISO date string YYYY-MM-DD
    required_skills: Mapped[Any] = mapped_column(JSON) # List[str] of skill identifiers
    readiness_threshold: Mapped[float] = mapped_column(Float, default=0.70)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    cohort: Mapped[Optional["Cohort"]] = relationship(back_populates="placement_drives")
    interventions: Mapped[List["MentorIntervention"]] = relationship(back_populates="placement_drive")

class MentorIntervention(Base):
    __tablename__ = "mentor_interventions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("learner_profiles.id", ondelete="CASCADE"), index=True)
    mentor_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    cohort_id: Mapped[Optional[int]] = mapped_column(ForeignKey("cohorts.id", ondelete="SET NULL"), nullable=True, index=True)
    placement_drive_id: Mapped[Optional[int]] = mapped_column(ForeignKey("placement_drives.id", ondelete="SET NULL"), nullable=True)
    action_type: Mapped[str] = mapped_column(String(50)) # TARGETED_1ON1, ASYNC_REVIEW, AI_ESCALATION_REVIEW, URGENT_INTERVENTION, INDEPENDENT_MONITORING
    priority: Mapped[str] = mapped_column(String(50), default="HIGH") # LOW, MEDIUM, HIGH, CRITICAL
    focus_skills: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True) # List[str]
    reason: Mapped[str] = mapped_column(Text)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="PENDING") # PENDING, SCHEDULED, IN_PROGRESS, RESOLVED, CANCELLED
    recommended_timing: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # WITHIN_24_HOURS, WITHIN_48_HOURS, THIS_WEEK, MONITOR_WEEKLY
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    profile: Mapped["LearnerProfile"] = relationship(back_populates="interventions")
    mentor: Mapped["User"] = relationship(back_populates="conducted_interventions")
    cohort: Mapped[Optional["Cohort"]] = relationship(back_populates="interventions")
    placement_drive: Mapped[Optional["PlacementDrive"]] = relationship(back_populates="interventions")

class AiCoachEscalation(Base):
    __tablename__ = "ai_coach_escalations"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("learner_profiles.id", ondelete="CASCADE"), index=True)
    skill_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    reason: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(50), default="HIGH") # LOW, MEDIUM, HIGH, CRITICAL
    thrash_index: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    source: Mapped[str] = mapped_column(String(50)) # ASSESSMENT_FAILURES, DEBUG_THRASH, CIRCULAR_QUESTIONS, SANDBOX_FAILURES
    status: Mapped[str] = mapped_column(String(50), default="OPEN") # OPEN, IN_REVIEW, RESOLVED
    context_data: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    profile: Mapped["LearnerProfile"] = relationship(back_populates="ai_escalations")

class MentorSessionRequest(Base):
    __tablename__ = "mentor_session_requests"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("learner_profiles.id", ondelete="CASCADE"), index=True)
    mentor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    skill_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default="OPEN", index=True) # OPEN, ACCEPTED, SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
    requested_duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    meeting_room_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    meeting_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    mentor_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recommendations: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    profile: Mapped["LearnerProfile"] = relationship(back_populates="mentor_session_requests")
    mentor: Mapped[Optional["User"]] = relationship(back_populates="mentored_sessions")

class LearnerResume(Base):
    __tablename__ = "learner_resumes"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("learner_profiles.id", ondelete="CASCADE"), index=True)
    original_filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(100))
    storage_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    raw_text: Mapped[str] = mapped_column(Text)
    parsed_data: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    profile: Mapped["LearnerProfile"] = relationship(back_populates="resumes")
    interview_sessions: Mapped[List["MockInterviewSession"]] = relationship(back_populates="resume")

class MockInterviewSession(Base):
    __tablename__ = "mock_interview_sessions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("learner_profiles.id", ondelete="CASCADE"), index=True)
    resume_id: Mapped[Optional[int]] = mapped_column(ForeignKey("learner_resumes.id", ondelete="SET NULL"), nullable=True, index=True)
    target_role: Mapped[str] = mapped_column(String(255))
    interview_type: Mapped[str] = mapped_column(String(50), default="COMPREHENSIVE") # COMPREHENSIVE, TECHNICAL, SYSTEM_DESIGN, BEHAVIORAL
    status: Mapped[str] = mapped_column(String(50), default="IN_PROGRESS", index=True) # IN_PROGRESS, COMPLETED, CANCELLED
    current_phase: Mapped[str] = mapped_column(String(50), default="INTRODUCTION")
    current_turn_index: Mapped[int] = mapped_column(Integer, default=0)
    context_snapshot: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    overall_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    technical_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    communication_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    resume_verification_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    confidence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    feedback_summary: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    profile: Mapped["LearnerProfile"] = relationship(back_populates="interview_sessions")
    resume: Mapped[Optional["LearnerResume"]] = relationship(back_populates="interview_sessions")
    turns: Mapped[List["MockInterviewTurn"]] = relationship(back_populates="session", cascade="all, delete-orphan", order_by="MockInterviewTurn.turn_index")

class MockInterviewTurn(Base):
    __tablename__ = "mock_interview_turns"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("mock_interview_sessions.id", ondelete="CASCADE"), index=True)
    turn_index: Mapped[int] = mapped_column(Integer)
    category: Mapped[str] = mapped_column(String(50), default="TECHNICAL_FUNDAMENTALS")
    question_text: Mapped[str] = mapped_column(Text)
    expected_rubrics: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    learner_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    input_mode: Mapped[str] = mapped_column(String(20), default="TEXT") # VOICE, TEXT
    evaluation_data: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    answer_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    detected_gap_data: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    session: Mapped["MockInterviewSession"] = relationship(back_populates="turns")


class HackathonEvent(Base):
    __tablename__ = "hackathon_events"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    external_id: Mapped[str] = mapped_column(String(255), index=True)
    source: Mapped[str] = mapped_column(String(100), index=True)
    title: Mapped[str] = mapped_column(String(512))
    organizer: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    mode: Mapped[Optional[str]] = mapped_column(String(50), default="online")
    prize_pool: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    registration_deadline: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    event_start_date: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    event_end_date: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    skills: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    cover_image: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    scraped_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint("source", "external_id", name="uq_hackathon_event_source_extid"),
    )





