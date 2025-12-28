from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
import redis
import json
import uuid
from datetime import datetime
ML_AVAILABLE = False
get_detector = None

try:
    import sys
    from pathlib import Path
    
    # Add project root to path
    project_root = Path(__file__).parent.parent.parent.parent
    sys.path.insert(0, str(project_root))
    
    from backend.ml_service.model_loader import get_detector
    ML_AVAILABLE = True
    print("✓ ML service loaded successfully!")
except Exception as e:
    print(f"⚠️  ML service not available: {e}")
    print("⚠️  Using pattern matching only")

from models.database import get_db
from models import schemas

router = APIRouter()

# Redis client
redis_client = redis.Redis(
    host='localhost',
    port=6379,
    decode_responses=True
)

# Request/Response models
class CodeAnalysisRequest(BaseModel):
    code: str
    file_path: str
    language: str
    project_id: Optional[str] = None

class Vulnerability(BaseModel):
    id: str
    category: str
    severity: str
    line_number: int
    column_number: int
    message: str
    code_snippet: str
    confidence_score: float

class AnalysisResponse(BaseModel):
    analysis_id: str
    status: str
    vulnerabilities: List[Vulnerability]
    analyzed_at: str
    scan_id: Optional[str] = None

# Real-time analysis endpoint
@router.post("/realtime", response_model=AnalysisResponse)
async def analyze_code_realtime(
    request: CodeAnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Analyze code in real-time for vulnerabilities
    """
    try:
        analysis_id = str(uuid.uuid4())
        
        # Create scan record
        scan = schemas.Scan(
            scan_type='realtime',
            status='running'
        )
        db.add(scan)
        db.commit()
        db.refresh(scan)
        
        # Add to Redis Stream for processing
        message = {
            'analysis_id': analysis_id,
            'scan_id': str(scan.id),
            'code': request.code,
            'file_path': request.file_path,
            'language': request.language,
            'project_id': request.project_id or 'default',
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Push to Redis Stream
        redis_client.xadd('code_analysis_stream', message)
        
        # Detect vulnerabilities
        vulnerabilities_list = detect_simple_vulnerabilities(
            request.code, 
            request.language
        )
        
        # Save vulnerabilities to database
        for vuln in vulnerabilities_list:
            db_vuln = schemas.Vulnerability(
                scan_id=scan.id,
                category=vuln.category,
                severity=vuln.severity,
                file_path=request.file_path,
                line_number=vuln.line_number,
                column_number=vuln.column_number,
                code_snippet=vuln.code_snippet,
                confidence_score=vuln.confidence_score,
                message=vuln.message,
                status='open'
            )
            db.add(db_vuln)
        
        # Update scan
        scan.status = 'completed'
        scan.completed_at = datetime.utcnow()
        scan.total_vulnerabilities = len(vulnerabilities_list)
        scan.total_files = 1
        db.commit()
        
        return AnalysisResponse(
            analysis_id=analysis_id,
            status="completed",
            vulnerabilities=vulnerabilities_list,
            analyzed_at=datetime.utcnow().isoformat(),
            scan_id=str(scan.id)
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# File analysis endpoint
@router.post("/file")
async def analyze_file(
    request: CodeAnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Analyze an entire file
    """
    try:
        analysis_id = str(uuid.uuid4())
        
        # Create scan record
        scan = schemas.Scan(
            scan_type='file',
            status='queued'
        )
        db.add(scan)
        db.commit()
        db.refresh(scan)
        
        # Store in Redis for batch processing
        redis_client.setex(
            f"analysis:{analysis_id}",
            3600,  # 1 hour expiry
            json.dumps({
                'scan_id': str(scan.id),
                'code': request.code,
                'file_path': request.file_path,
                'language': request.language,
                'status': 'queued'
            })
        )
        
        return {
            "analysis_id": analysis_id,
            "scan_id": str(scan.id),
            "status": "queued",
            "message": "File queued for analysis"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# Get analysis result
@router.get("/result/{analysis_id}")
async def get_analysis_result(analysis_id: str):
    """
    Get analysis results by ID
    """
    try:
        result = redis_client.get(f"analysis:{analysis_id}")
        
        if not result:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        return json.loads(result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get scan by ID
@router.get("/scan/{scan_id}")
async def get_scan(scan_id: str, db: Session = Depends(get_db)):
    """
    Get scan details and vulnerabilities by scan ID
    """
    try:
        # Query scan
        scan = db.query(schemas.Scan).filter(schemas.Scan.id == scan_id).first()
        
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")
        
        # Query vulnerabilities
        vulnerabilities = db.query(schemas.Vulnerability).filter(
            schemas.Vulnerability.scan_id == scan_id
        ).all()
        
        return {
            "scan_id": str(scan.id),
            "scan_type": scan.scan_type,
            "status": scan.status,
            "started_at": scan.started_at.isoformat() if scan.started_at else None,
            "completed_at": scan.completed_at.isoformat() if scan.completed_at else None,
            "total_files": scan.total_files,
            "total_vulnerabilities": scan.total_vulnerabilities,
            "vulnerabilities": [
                {
                    "id": str(v.id),
                    "category": v.category,
                    "severity": v.severity,
                    "file_path": v.file_path,
                    "line_number": v.line_number,
                    "column_number": v.column_number,
                    "code_snippet": v.code_snippet,
                    "message": v.message,
                    "confidence_score": v.confidence_score,
                    "status": v.status,
                    "created_at": v.created_at.isoformat() if v.created_at else None
                }
                for v in vulnerabilities
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get all scans with summary
@router.get("/scans")
async def get_all_scans(
    limit: int = 10,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Get all scans with pagination
    """
    try:
        scans = db.query(schemas.Scan).order_by(
            schemas.Scan.started_at.desc()
        ).limit(limit).offset(offset).all()
        
        return {
            "scans": [
                {
                    "scan_id": str(scan.id),
                    "scan_type": scan.scan_type,
                    "status": scan.status,
                    "started_at": scan.started_at.isoformat() if scan.started_at else None,
                    "completed_at": scan.completed_at.isoformat() if scan.completed_at else None,
                    "total_files": scan.total_files,
                    "total_vulnerabilities": scan.total_vulnerabilities
                }
                for scan in scans
            ],
            "total": db.query(schemas.Scan).count()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Simple pattern-based vulnerability detection (placeholder)
def detect_simple_vulnerabilities(code: str, language: str) -> List[Vulnerability]:
    """
    Hybrid vulnerability detection: Pattern matching + ML model
    """
    vulnerabilities = []
    lines = code.split('\n')
    
    # === PATTERN-BASED DETECTION ===
    # SQL Injection patterns
    sql_patterns = ['execute(', 'cursor.execute(', '.query(', 'SELECT * FROM']
    
    # XSS patterns
    xss_patterns = ['innerHTML =', 'document.write(', 'eval(']
    
    # Hardcoded secrets patterns
    secret_patterns = ['password =', 'api_key =', 'secret =', 'token =']
    
    for line_num, line in enumerate(lines, start=1):
        line_lower = line.lower()
        
        # Check for SQL injection
        for pattern in sql_patterns:
            if pattern.lower() in line_lower and '+' in line:
                vulnerabilities.append(Vulnerability(
                    id=str(uuid.uuid4()),
                    category="SQL Injection",
                    severity="CRITICAL",
                    line_number=line_num,
                    column_number=line.find(pattern),
                    message="Possible SQL injection: String concatenation in SQL query",
                    code_snippet=line.strip(),
                    confidence_score=0.75
                ))
        
        # Check for XSS
        for pattern in xss_patterns:
            if pattern.lower() in line_lower:
                vulnerabilities.append(Vulnerability(
                    id=str(uuid.uuid4()),
                    category="Cross-Site Scripting (XSS)",
                    severity="HIGH",
                    line_number=line_num,
                    column_number=line.find(pattern),
                    message="Possible XSS vulnerability: Unsafe HTML manipulation",
                    code_snippet=line.strip(),
                    confidence_score=0.68
                ))
        
        # Check for hardcoded secrets
        for pattern in secret_patterns:
            if pattern.lower() in line_lower and ('=' in line or ':' in line):
                if '"' in line or "'" in line:
                    vulnerabilities.append(Vulnerability(
                        id=str(uuid.uuid4()),
                        category="Hardcoded Secrets",
                        severity="HIGH",
                        line_number=line_num,
                        column_number=line.find(pattern),
                        message="Hardcoded secret detected: Use environment variables instead",
                        code_snippet=line.strip(),
                        confidence_score=0.82
                    ))
    
    # === ML MODEL DETECTION ===
    if ML_AVAILABLE:
        try:
            detector = get_detector()
            ml_predictions = detector.predict(code, threshold=0.6)
            
            # Add ML-detected vulnerabilities
            for pred in ml_predictions:
                # Check if similar vulnerability already detected by patterns
                is_duplicate = any(
                    v.category == pred['category'] 
                    for v in vulnerabilities
                )
                
                if not is_duplicate:
                    vulnerabilities.append(Vulnerability(
                        id=str(uuid.uuid4()),
                        category=pred['category'],
                        severity=pred['severity'],
                        line_number=1,  # ML can't pinpoint exact line
                        column_number=0,
                        message=f"ML Model detected {pred['category']} (confidence: {pred['confidence']:.0%})",
                        code_snippet=code[:100] + "..." if len(code) > 100 else code,
                        confidence_score=pred['confidence']
                    ))
        except Exception as e:
            print(f"ML detection error: {e}")
            # Continue with pattern-based results
    
    return vulnerabilities