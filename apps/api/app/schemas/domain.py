from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class SkillBase(BaseModel):
    name: str
    description: str

class Skill(SkillBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class ResourceBase(BaseModel):
    title: str
    content: str
    url: str

class Resource(ResourceBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class PathMilestoneBase(BaseModel):
    skill_id: int
    status: str

class PathMilestone(PathMilestoneBase):
    id: int
    path_id: int
    model_config = ConfigDict(from_attributes=True)

class LearningPathBase(BaseModel):
    goal: str

class LearningPath(LearningPathBase):
    id: int
    profile_id: int
    milestones: List[PathMilestone] = []
    model_config = ConfigDict(from_attributes=True)
