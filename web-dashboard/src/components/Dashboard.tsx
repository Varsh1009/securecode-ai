import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, Activity, RefreshCw } from 'lucide-react';

interface Stats {
  total_scans: number;
  total_vulnerabilities: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
}

interface Scan {
  scan_id: string;
  scan_type: string;
  status: string;
  started_at: string;
  total_vulnerabilities: number;
}

interface Vulnerability {
  id: string;
  category: string;
  severity: string;
  file_path: string;
  line_number: number;
  message: string;
  confidence_score: number;
}

export const Dashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch recent scans
      const scansResponse = await fetch('http://localhost:8001/api/analyze/scans?limit=10');
      const scansData = await scansResponse.json();
      setScans(scansData.scans || []);

      // Calculate stats from scans
      let totalVulns = 0;
      let critical = 0;
      let high = 0;
      let medium = 0;
      let low = 0;
      const allVulnerabilities: Vulnerability[] = [];

      // Fetch details for recent scans
      for (const scan of scansData.scans.slice(0, 3)) {
        try {
          const scanResponse = await fetch(`http://localhost:8001/api/analyze/scan/${scan.scan_id}`);
          const scanDetail = await scanResponse.json();
          
          if (scanDetail.vulnerabilities) {
            scanDetail.vulnerabilities.forEach((v: Vulnerability) => {
              allVulnerabilities.push(v);
              totalVulns++;
              if (v.severity === 'CRITICAL') critical++;
              else if (v.severity === 'HIGH') high++;
              else if (v.severity === 'MEDIUM') medium++;
              else if (v.severity === 'LOW') low++;
            });
          }
        } catch (err) {
          console.error('Error fetching scan detail:', err);
        }
      }

      setStats({
        total_scans: scansData.total || 0,
        total_vulnerabilities: totalVulns,
        critical_count: critical,
        high_count: high,
        medium_count: medium,
        low_count: low,
      });

      setVulnerabilities(allVulnerabilities.slice(0, 10));
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch data. Is the API running?');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-400 bg-red-500/20';
      case 'HIGH': return 'text-orange-400 bg-orange-500/20';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-500/20';
      case 'LOW': return 'text-green-400 bg-green-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="text-red-400 mx-auto mb-4" size={48} />
          <p className="text-red-400 text-xl">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Shield className="text-blue-400" size={40} />
            SecureCode AI Dashboard
          </h1>
          <p className="text-gray-400 mt-2">Real-time code vulnerability monitoring</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg border border-gray-700 transition-colors"
        >
          <RefreshCw size={20} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Scans</p>
              <p className="text-3xl font-bold mt-2">{stats?.total_scans || 0}</p>
            </div>
            <Activity className="text-blue-400" size={32} />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Critical Issues</p>
              <p className="text-3xl font-bold mt-2 text-red-400">{stats?.critical_count || 0}</p>
            </div>
            <AlertTriangle className="text-red-400" size={32} />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">High Priority</p>
              <p className="text-3xl font-bold mt-2 text-orange-400">{stats?.high_count || 0}</p>
            </div>
            <AlertTriangle className="text-orange-400" size={32} />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Vulnerabilities</p>
              <p className="text-3xl font-bold mt-2 text-purple-400">{stats?.total_vulnerabilities || 0}</p>
            </div>
            <Shield className="text-purple-400" size={32} />
          </div>
        </div>
      </div>

      {/* Recent Scans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h2 className="text-xl font-bold mb-4">Recent Scans</h2>
          <div className="space-y-3">
            {scans.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No scans yet. Use the VS Code extension to start scanning!
              </p>
            ) : (
              scans.slice(0, 5).map((scan) => (
                <div
                  key={scan.scan_id}
                  className="flex items-center justify-between p-4 bg-gray-750 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div>
                    <p className="font-medium">{scan.scan_type} scan</p>
                    <p className="text-sm text-gray-400">
                      {new Date(scan.started_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400">
                      {scan.total_vulnerabilities} issues
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        scan.status === 'completed'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {scan.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Security Score */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h2 className="text-xl font-bold mb-4">Security Breakdown</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Critical</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{
                      width: `${stats ? (stats.critical_count / (stats.total_vulnerabilities || 1)) * 100 : 0}%`
                    }}
                  ></div>
                </div>
                <span className="text-red-400 font-bold w-8">{stats?.critical_count || 0}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-400">High</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{
                      width: `${stats ? (stats.high_count / (stats.total_vulnerabilities || 1)) * 100 : 0}%`
                    }}
                  ></div>
                </div>
                <span className="text-orange-400 font-bold w-8">{stats?.high_count || 0}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-400">Medium</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{
                      width: `${stats ? (stats.medium_count / (stats.total_vulnerabilities || 1)) * 100 : 0}%`
                    }}
                  ></div>
                </div>
                <span className="text-yellow-400 font-bold w-8">{stats?.medium_count || 0}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-400">Low</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${stats ? (stats.low_count / (stats.total_vulnerabilities || 1)) * 100 : 0}%`
                    }}
                  ></div>
                </div>
                <span className="text-green-400 font-bold w-8">{stats?.low_count || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vulnerabilities Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Recent Vulnerabilities</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-750">
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-6 text-gray-400 font-medium">Severity</th>
                <th className="text-left py-3 px-6 text-gray-400 font-medium">Category</th>
                <th className="text-left py-3 px-6 text-gray-400 font-medium">File</th>
                <th className="text-left py-3 px-6 text-gray-400 font-medium">Line</th>
                <th className="text-left py-3 px-6 text-gray-400 font-medium">Message</th>
                <th className="text-left py-3 px-6 text-gray-400 font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {vulnerabilities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    No vulnerabilities found 🎉
                  </td>
                </tr>
              ) : (
                vulnerabilities.map((vuln) => (
                  <tr
                    key={vuln.id}
                    className="border-b border-gray-700 hover:bg-gray-750 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityColor(vuln.severity)}`}>
                        {vuln.severity}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium">{vuln.category}</td>
                    <td className="py-4 px-6 text-gray-400 text-sm">
                      {vuln.file_path.split('/').pop()}
                    </td>
                    <td className="py-4 px-6 text-gray-400">{vuln.line_number}</td>
                    <td className="py-4 px-6 text-sm max-w-md truncate">{vuln.message}</td>
                    <td className="py-4 px-6 text-gray-400">
                      {Math.round(vuln.confidence_score * 100)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};