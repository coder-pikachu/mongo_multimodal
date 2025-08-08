'use client'
import { ClientProjectData } from "@/types/clientTypes";
import DataList from './DataList';
import { Database, Filter, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';

interface DataExplorerViewProps {
    projectId: string;
    data: ClientProjectData[];
    onSelectForChat: () => void;
    onSelectForAgent: () => void;
}

export default function DataExplorerView({ projectId, data, onSelectForChat, onSelectForAgent }: DataExplorerViewProps) {
    const [showUnanalyzedOnly, setShowUnanalyzedOnly] = useState(false);

    const isUnanalyzed = (d: ClientProjectData) => d.type === 'image' && !(d.analysis?.description && d.analysis.description.trim().length > 0);

    const filtered = useMemo(() => {
        if (!showUnanalyzedOnly) return data;
        return data.filter(isUnanalyzed);
    }, [data, showUnanalyzedOnly]);

    const unanalyzedCount = useMemo(() => data.filter(isUnanalyzed).length, [data]);

    const handleBulkAnalyze = async () => {
        try {
            const ids = data.filter(isUnanalyzed).map(d => d._id);
            if (ids.length === 0) return;
            // Ask server which ids are valid in scope (returns canonical ids)
            const resp = await fetch(`/api/projects/${projectId}/data/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids })
            });
            if (!resp.ok) throw new Error('Bulk analyze init failed');
            const { ids: validIds } = await resp.json();
            // Process sequentially to stay token-safe
            for (const id of validIds) {
                await fetch(`/api/projects/data/${id}/analyze`, { method: 'POST' });
            }
            // Force a refresh by reloading the page data (caller page will refetch)
            location.reload();
        } catch (e) {
            console.error('Bulk analyze error:', e);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <Database className="h-5 w-5 text-gray-500" />
                    <h2 className="text-2xl font-bold">Data Explorer</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowUnanalyzedOnly(v => !v)}
                        className={`px-3 py-1 text-xs rounded border ${showUnanalyzedOnly ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'}`}
                        title="Show only items without analysis"
                    >
                        <Filter className="h-3 w-3 inline mr-1" />
                        Unanalyzed only
                    </button>
                    <button
                        onClick={handleBulkAnalyze}
                        className="px-3 py-1 text-xs rounded bg-amber-500 text-white hover:bg-amber-600"
                        title="Analyze all filtered images and generate tags/description"
                    >
                        <Wand2 className="h-3 w-3 inline mr-1" />
                        Analyze {unanalyzedCount} images
                    </button>
                </div>
            </div>
            <div className="flex-grow overflow-y-auto">
                <DataList
                    projectId={projectId}
                    data={filtered}
                    onSelectForChat={onSelectForChat}
                    onSelectForAgent={onSelectForAgent}
                />
            </div>
        </div>
    );
}