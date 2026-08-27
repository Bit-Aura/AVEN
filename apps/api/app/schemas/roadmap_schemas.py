from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class RoadmapItemSchema(BaseModel):
    slug: str
    title: str
    updatedAt: Optional[str] = None
    cached: bool = False
    fetched_at: Optional[datetime] = None
    credits_spent: int = 0

class RoadmapAvailableResponse(BaseModel):
    roadmaps: List[RoadmapItemSchema]
    total: int

class RoadmapSyncResponse(BaseModel):
    slug: str
    status: str
    skills_upserted: int
    edges_upserted: int
    resources_extracted: int
    cycles_detected: int
    conflicts_logged: int
    credits_spent: int

class RoadmapConflictItemSchema(BaseModel):
    id: int
    slug: Optional[str] = None
    conflict_type: str
    payload: Dict[str, Any]
    resolved: bool
    created_at: datetime

class RoadmapConflictsListResponse(BaseModel):
    conflicts: List[RoadmapConflictItemSchema]
    total: int

class RoleRoadmapMappingSchema(BaseModel):
    role_id: str
    roadmap_slugs: List[str]

class RoleRoadmapMappingUpdateInput(BaseModel):
    role_id: str
    roadmap_slugs: List[str]

class RoleRoadmapMappingsListResponse(BaseModel):
    mappings: Dict[str, List[str]]

class NormalizedSkillPreview(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    difficulty: str
    est_hours: float
    source: str
    roadmap_slug: str
    external_node_id: str

class CandidateEdgePreview(BaseModel):
    source_id: str
    target_id: str
    type: str = "PREREQUISITE_OF"

class RoadmapPreviewResponse(BaseModel):
    slug: str
    skills: List[NormalizedSkillPreview]
    edges: List[CandidateEdgePreview]
    is_dag: bool
    cycles: List[List[str]] = []
    total_skills: int
    total_edges: int
