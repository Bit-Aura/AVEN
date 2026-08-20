from typing import List, Optional
from datetime import datetime
from sqlalchemy import Column, String, ForeignKey, Table, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from .base import Base

# Self-referential many-to-many association table for Skill prerequisites
skill_prerequisites = Table(
    "skill_prerequisites",
    Base.metadata,
    Column("skill_id", ForeignKey("skills.id"), primary_key=True),
    Column("prerequisite_id", ForeignKey("skills.id"), primary_key=True),
)

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    clerk_id: Mapped[str] = mapped_column(String, unique=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    
    profile: Mapped["LearnerProfile"] = relationship(back_populates="user", uselist=False)

class Skill(Base):
    __tablename__ = "skills"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True)
    description: Mapped[str] = mapped_column(Text)
    
    # 384 dimensions for all-MiniLM-L6-v2
    embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(384))
    
    prerequisites: Mapped[List["Skill"]] = relationship(
        "Skill",
        secondary=skill_prerequisites,
        primaryjoin=id==skill_prerequisites.c.skill_id,
        secondaryjoin=id==skill_prerequisites.c.prerequisite_id,
        backref="required_by"
    )

class Resource(Base):
    __tablename__ = "resources"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String)
    content: Mapped[str] = mapped_column(Text)
    url: Mapped[str] = mapped_column(String)
    
    embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(384))
    
class LearnerProfile(Base):
    __tablename__ = "learner_profiles"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    current_context: Mapped[str] = mapped_column(Text, nullable=True)
    
    user: Mapped["User"] = relationship(back_populates="profile")
    paths: Mapped[List["LearningPath"]] = relationship(back_populates="profile")

class LearningPath(Base):
    __tablename__ = "learning_paths"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("learner_profiles.id"))
    goal: Mapped[str] = mapped_column(String)
    
    profile: Mapped["LearnerProfile"] = relationship(back_populates="paths")
    milestones: Mapped[List["PathMilestone"]] = relationship(back_populates="path")

class PathMilestone(Base):
    __tablename__ = "path_milestones"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    path_id: Mapped[int] = mapped_column(ForeignKey("learning_paths.id"))
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id"))
    status: Mapped[str] = mapped_column(String, default="pending") # pending, in_progress, completed
    
    path: Mapped["LearningPath"] = relationship(back_populates="milestones")

class FeedbackEvent(Base):
    __tablename__ = "feedback_events"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    milestone_id: Mapped[int] = mapped_column(ForeignKey("path_milestones.id"))
    feedback_type: Mapped[str] = mapped_column(String) # too_easy, too_hard, completed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
