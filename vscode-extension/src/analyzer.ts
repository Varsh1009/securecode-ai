import axios, { AxiosInstance } from 'axios';

export interface Vulnerability {
    id: string;
    category: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    line_number: number;
    column_number: number;
    message: string;
    code_snippet: string;
    confidence_score: number;
}

export interface AnalysisResult {
    analysis_id: string;
    status: string;
    vulnerabilities: Vulnerability[];
    analyzed_at: string;
    scan_id?: string;
}

export class AnalyzerClient {
    private client: AxiosInstance;
    private apiUrl: string;

    constructor(apiUrl: string) {
        this.apiUrl = apiUrl;
        this.client = axios.create({
            baseURL: apiUrl,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    async analyzeCode(
        code: string,
        filePath: string,
        language: string
    ): Promise<AnalysisResult> {
        try {
            const response = await this.client.post<AnalysisResult>(
                '/api/analyze/realtime',
                {
                    code,
                    file_path: filePath,
                    language,
                }
            );

            return response.data;
        } catch (error) {
            console.error('API Error:', error);
            throw new Error('Failed to analyze code. Is the SecureCode API running?');
        }
    }

    async getScan(scanId: string): Promise<any> {
        try {
            const response = await this.client.get(`/api/analyze/scan/${scanId}`);
            return response.data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            const response = await this.client.get('/health');
            return response.data.status === 'healthy';
        } catch (error) {
            return false;
        }
    }

    dispose() {
        // Cleanup if needed
    }
}