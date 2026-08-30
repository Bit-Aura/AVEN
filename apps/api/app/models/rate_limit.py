from sqlalchemy import Column, Integer, String, Float
from app.models.base import Base

class RateLimit(Base):
    __tablename__ = "rate_limits"
    id = Column(Integer, primary_key=True, index=True)
    client_ip = Column(String, index=True)
    timestamp = Column(Float, index=True)
