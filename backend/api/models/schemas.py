from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from .database import Base

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    language = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Scan(Base):
    __tablename__ = "scans"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey('projects.id', ondelete='CASCADE'))
    scan_type = Column(String(50), nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    total_files = Column(Integer, default=0)
    total_vulnerabilities = Column(Integer, default=0)
    status = Column(String(20), default='running')

class Vulnerability(Base):
    __tablename__ = "vulnerabilities"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = Column(UUID(as_uuid=True), ForeignKey('scans.id', ondelete='CASCADE'))
    category = Column(String(100), nullable=False)
    severity = Column(String(20), nullable=False)
    file_path = Column(Text, nullable=False)
    line_number = Column(Integer)
    column_number = Column(Integer)
    code_snippet = Column(Text)
    confidence_score = Column(Float)
    message = Column(Text)
    status = Column(String(20), default='open')
    created_at = Column(DateTime(timezone=True), server_default=func.now())