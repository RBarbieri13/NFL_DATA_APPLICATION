import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Database, DollarSign, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:10000';

const Admin = () => {
  // Data loading state
  const [selectedWeek, setSelectedWeek] = useState(12);
  const [isLoading, setIsLoading] = useState(false);
  const [loadResult, setLoadResult] = useState(null);

  // Status state
  const [dataStatus, setDataStatus] = useState(null);
  const [pricingStatus, setPricingStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState(null);

  // Fetch current data status
  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError(null);

    try {
      // Fetch data status - which weeks have player data
      const dataResponse = await fetch(`${BACKEND_URL}/api/admin/data-status`);
      if (dataResponse.ok) {
        const data = await dataResponse.json();
        setDataStatus(data);
      }

      // Fetch DraftKings pricing status
      const pricingResponse = await fetch(`${BACKEND_URL}/api/admin/pricing-status`);
      if (pricingResponse.ok) {
        const pricing = await pricingResponse.json();
        setPricingStatus(pricing);
      }
    } catch (err) {
      console.error('Error fetching status:', err);
      setStatusError(err.message);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Handle data refresh
  const handleRefreshData = async () => {
    setIsLoading(true);
    setLoadResult(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/refresh-data?seasons=2025`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      setLoadResult({
        success: true,
        message: `Loaded ${result.records_loaded} player records and ${result.snap_records_loaded} snap records`,
        timestamp: new Date().toLocaleString()
      });

      // Refresh status after loading
      await fetchStatus();
    } catch (err) {
      setLoadResult({
        success: false,
        message: `Error: ${err.message}`,
        timestamp: new Date().toLocaleString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Week status indicator
  const WeekIndicator = ({ week, hasData, hasPricing }) => {
    const getStatusColor = () => {
      if (hasData && hasPricing) return 'bg-green-500';
      if (hasData) return 'bg-yellow-500';
      return 'bg-gray-300';
    };

    const getStatusText = () => {
      if (hasData && hasPricing) return 'Complete';
      if (hasData) return 'Data Only';
      return 'No Data';
    };

    return (
      <div className="flex flex-col items-center p-2 border rounded-lg bg-white shadow-sm min-w-[60px]">
        <span className="text-xs text-gray-500 mb-1">Wk {week}</span>
        <div className={`w-4 h-4 rounded-full ${getStatusColor()}`} title={getStatusText()} />
        <span className="text-[10px] text-gray-400 mt-1">{getStatusText()}</span>
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Database className="h-8 w-8 text-blue-600" />
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Manage data loading and monitor system status</p>
        </div>

        {/* Data Loading Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-500" />
            Load Player Data
          </h2>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Load Data Through Week:
              </label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                className="border border-gray-300 rounded-lg px-4 py-2 text-lg font-semibold bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              >
                {[...Array(18)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>Week {i + 1}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleRefreshData}
              disabled={isLoading}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-white transition-all ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
              }`}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <RefreshCw className="h-5 w-5" />
              )}
              <span>{isLoading ? 'Loading...' : 'Refresh NFL Data'}</span>
            </button>

            <button
              onClick={fetchStatus}
              disabled={statusLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
            >
              <RefreshCw className={`h-4 w-4 ${statusLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>
          </div>

          {/* Load Result */}
          {loadResult && (
            <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
              loadResult.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              {loadResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`font-medium ${loadResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {loadResult.message}
                </p>
                <p className="text-sm text-gray-500 mt-1">{loadResult.timestamp}</p>
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Data is loaded from nflreadpy (nflverse). This will fetch all available
              player stats and snap counts for the 2025 season. DraftKings pricing is loaded separately.
            </p>
          </div>
        </div>

        {/* Data Status Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-green-500" />
            Player Data Status (2025 Season)
          </h2>

          {statusLoading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading status...
            </div>
          ) : statusError ? (
            <div className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error loading status: {statusError}
            </div>
          ) : dataStatus ? (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Total Records</p>
                  <p className="text-2xl font-bold text-blue-800">{dataStatus.total_records?.toLocaleString() || 0}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Weeks Loaded</p>
                  <p className="text-2xl font-bold text-green-800">{dataStatus.weeks_with_data?.length || 0}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Max Week</p>
                  <p className="text-2xl font-bold text-purple-800">{dataStatus.max_week || 0}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-orange-600 font-medium">With Snap %</p>
                  <p className="text-2xl font-bold text-orange-800">{dataStatus.records_with_snaps?.toLocaleString() || 0}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-2">
                <strong>Weeks with data:</strong> {dataStatus.weeks_with_data?.join(', ') || 'None'}
              </p>
            </div>
          ) : (
            <p className="text-gray-500">No data status available</p>
          )}
        </div>

        {/* DraftKings Pricing Status */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            DraftKings Pricing Status (2025 Season)
          </h2>

          {statusLoading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading pricing status...
            </div>
          ) : pricingStatus ? (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Total Pricing Records</p>
                  <p className="text-2xl font-bold text-green-800">{pricingStatus.total_pricing_records?.toLocaleString() || 0}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Weeks with Pricing</p>
                  <p className="text-2xl font-bold text-blue-800">{pricingStatus.weeks_with_pricing?.length || 0}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Players with Price</p>
                  <p className="text-2xl font-bold text-purple-800">{pricingStatus.players_with_salary?.toLocaleString() || 0}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-600 font-medium">Coverage Rate</p>
                  <p className="text-2xl font-bold text-yellow-800">{pricingStatus.coverage_percentage?.toFixed(1) || 0}%</p>
                </div>
              </div>

              <p className="text-sm font-medium text-gray-700 mb-3">Week-by-Week Status:</p>
              <div className="flex flex-wrap gap-2">
                {[...Array(18)].map((_, i) => {
                  const week = i + 1;
                  const hasData = dataStatus?.weeks_with_data?.includes(week);
                  const hasPricing = pricingStatus?.weeks_with_pricing?.includes(week);
                  return (
                    <WeekIndicator
                      key={week}
                      week={week}
                      hasData={hasData}
                      hasPricing={hasPricing}
                    />
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-gray-600">Data + Pricing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-gray-600">Data Only (No Pricing)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <span className="text-gray-600">No Data</span>
                </div>
              </div>

              {pricingStatus.weeks_with_pricing?.length > 0 && (
                <p className="text-sm text-gray-600 mt-3">
                  <strong>Weeks with DraftKings pricing:</strong> {pricingStatus.weeks_with_pricing.join(', ')}
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-yellow-800 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                No DraftKings pricing data available. Pricing is typically loaded on Wednesdays when new slates are released.
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => window.open(`${BACKEND_URL}/docs`, '_blank')}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
            >
              <p className="font-semibold text-gray-800">API Documentation</p>
              <p className="text-sm text-gray-500">View FastAPI Swagger docs</p>
            </button>
            <button
              onClick={async () => {
                const response = await fetch(`${BACKEND_URL}/api/health`);
                const data = await response.json();
                alert(`Server Status: ${data.status || 'OK'}\nDatabase: ${data.database || 'Connected'}`);
              }}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all text-left"
            >
              <p className="font-semibold text-gray-800">Health Check</p>
              <p className="text-sm text-gray-500">Check API server status</p>
            </button>
            <button
              onClick={() => {
                const url = `${BACKEND_URL}/api/players?season=2025&limit=10`;
                window.open(url, '_blank');
              }}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all text-left"
            >
              <p className="font-semibold text-gray-800">Test API</p>
              <p className="text-sm text-gray-500">View raw API response</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
