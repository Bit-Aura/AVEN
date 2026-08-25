from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

class AdminOverviewResponse(BaseModel):
    total_users: int
    active_users: int
    total_mentors: int
    pending_mentors: int
    total_resources: int
    pending_resources: int
    pending_actions: List[Dict[str, Any]] = []

class SystemHealthResponse(BaseModel):
    status: str
    uptime_seconds: float
    api_status: str
    database_status: str
    graph_db_status: str
    scraper_sources_count: int
    timestamp: str

class AdminUserItem(BaseModel):
    id: int
    clerk_id: str
    email: str
    name: Optional[str] = None
    role: str
    is_active: bool
    created_at: str

    model_config = ConfigDict(from_attributes=True)

class AdminUsersListResponse(BaseModel):
    users: List[AdminUserItem]
    total: int

class UserStatusUpdateInput(BaseModel):
    is_active: bool

class UserRoleUpdateInput(BaseModel):
    role: str = Field(..., description="learner, mentor, or admin")

class MentorApplicationItem(BaseModel):
    id: int
    user_id: int
    user_email: str
    name: str
    expertise: str
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    status: str
    rejection_reason: Optional[str] = None
    created_at: str
    updated_at: str

    model_config = ConfigDict(from_attributes=True)

class MentorApplicationsListResponse(BaseModel):
    applications: List[MentorApplicationItem]
    total: int

class MentorApplyInput(BaseModel):
    name: str
    expertise: str
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None

class MentorReviewInput(BaseModel):
    reason: Optional[str] = None

class PlatformResourceItem(BaseModel):
    id: int
    title: str
    content: str
    url: str
    resource_type: str
    skill_id: Optional[str] = None
    submitted_by_id: Optional[int] = None
    submitted_by_email: Optional[str] = None
    status: str
    rejection_reason: Optional[str] = None
    created_at: str
    updated_at: str

    model_config = ConfigDict(from_attributes=True)

class PlatformResourcesListResponse(BaseModel):
    resources: List[PlatformResourceItem]
    total: int

class ResourceCreateInput(BaseModel):
    title: str
    content: str
    url: str
    resource_type: str = "tutorial"
    skill_id: Optional[str] = None

class ResourceUpdateInput(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    url: Optional[str] = None
    resource_type: Optional[str] = None
    skill_id: Optional[str] = None

class ResourceReviewInput(BaseModel):
    reason: Optional[str] = None
