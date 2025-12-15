import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Play, AlertTriangle } from 'lucide-react';
import { dataApi } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function CustomSQL() {
  const [query, setQuery] = useState('SELECT * FROM analytics LIMIT 100');
  const [results, setResults] = useState(null);
  const [columns, setColumns] = useState([]);

  const executeMutation = useMutation({
    mutationFn: (sql) => dataApi.runCustomSql(sql),
    onSuccess: (response) => {
      const data = response.data.data || [];
      setResults(data);

      // Generate columns from first row
      if (data.length > 0) {
        const cols = Object.keys(data[0]).map((key) => ({
          key,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        }));
        setColumns(cols);
      } else {
        setColumns([]);
      }

      toast.success(`Query executed. ${data.length} rows returned.`);
    },
    onError: (error) => {
      const message = error.response?.data?.error?.message || 'Query execution failed';
      toast.error(message);
      setResults(null);
      setColumns([]);
    },
  });

  const handleExecute = () => {
    if (!query.trim()) {
      toast.error('Please enter a SQL query');
      return;
    }
    executeMutation.mutate(query);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Custom SQL</h1>
        <p className="text-secondary-600 mt-1">
          Execute custom SQL queries (SELECT only)
        </p>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-yellow-800">Admin Only Feature</p>
          <p className="text-sm text-yellow-700 mt-1">
            Only SELECT queries are allowed. Be careful with large result sets.
          </p>
        </div>
      </div>

      {/* Query Editor */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-lg font-semibold text-secondary-900">SQL Query</h2>
          <button
            onClick={handleExecute}
            disabled={executeMutation.isPending}
            className="btn btn-primary"
          >
            {executeMutation.isPending ? (
              <>
                <LoadingSpinner size="sm" className="p-0 mr-2" />
                Executing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Execute
              </>
            )}
          </button>
        </div>
        <div className="card-body">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input font-mono text-sm min-h-[200px]"
            placeholder="Enter your SQL query here..."
          />
        </div>
      </div>

      {/* Results */}
      {executeMutation.isPending && <LoadingSpinner />}

      {results && (
        <DataTable
          data={results}
          columns={columns}
          title={`Query Results (${results.length} rows)`}
          pageSize={20}
        />
      )}
    </div>
  );
}
