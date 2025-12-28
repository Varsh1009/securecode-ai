-- Initial Database Schema for SecureCode AI

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    repo_url TEXT,
    language VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vulnerability patterns library
CREATE TABLE vulnerability_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    cwe_id VARCHAR(20),
    owasp_category VARCHAR(50),
    description TEXT,
    code_pattern TEXT,
    example_vulnerable_code TEXT,
    example_fix TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scans table
CREATE TABLE scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    scan_type VARCHAR(50) NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    total_files INT DEFAULT 0,
    total_vulnerabilities INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'running'
);

-- Vulnerabilities detected
CREATE TABLE vulnerabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
    pattern_id UUID REFERENCES vulnerability_patterns(id),
    file_path TEXT NOT NULL,
    line_number INT,
    column_number INT,
    code_snippet TEXT,
    confidence_score FLOAT,
    severity VARCHAR(20),
    status VARCHAR(20) DEFAULT 'open',
    explanation TEXT,
    fix_suggestion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User feedback on vulnerabilities
CREATE TABLE vulnerability_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vulnerability_id UUID REFERENCES vulnerabilities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    feedback_type VARCHAR(50),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Telemetry data
CREATE TABLE analysis_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    service_name VARCHAR(100),
    operation VARCHAR(100),
    duration_ms INT,
    success BOOLEAN,
    error_message TEXT,
    metadata JSONB
);

-- Model performance tracking
CREATE TABLE model_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_version VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accuracy FLOAT,
    precision_score FLOAT,
    recall FLOAT,
    f1_score FLOAT,
    false_positive_rate FLOAT,
    evaluation_dataset VARCHAR(100)
);

-- Indexes for performance
CREATE INDEX idx_vulnerabilities_scan ON vulnerabilities(scan_id);
CREATE INDEX idx_vulnerabilities_severity ON vulnerabilities(severity);
CREATE INDEX idx_vulnerabilities_status ON vulnerabilities(status);
CREATE INDEX idx_scans_project ON scans(project_id);
CREATE INDEX idx_scans_status ON scans(status);
CREATE INDEX idx_feedback_vulnerability ON vulnerability_feedback(vulnerability_id);
CREATE INDEX idx_metrics_timestamp ON analysis_metrics(timestamp);
CREATE INDEX idx_metrics_service ON analysis_metrics(service_name);

-- Insert some sample vulnerability patterns
INSERT INTO vulnerability_patterns (category, severity, cwe_id, description) VALUES
('SQL Injection', 'CRITICAL', 'CWE-89', 'SQL query constructed using string concatenation with user input'),
('XSS', 'HIGH', 'CWE-79', 'User input rendered in HTML without sanitization'),
('Hardcoded Secrets', 'HIGH', 'CWE-798', 'API keys or passwords hardcoded in source code'),
('Path Traversal', 'HIGH', 'CWE-22', 'File path constructed from user input without validation'),
('Command Injection', 'CRITICAL', 'CWE-78', 'System command executed with user-controlled input');
