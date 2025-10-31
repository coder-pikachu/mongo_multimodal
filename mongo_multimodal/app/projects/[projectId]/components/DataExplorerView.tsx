'use client'
import { ClientProjectData } from "@/types/clientTypes";
import DataList from './DataList';
import BatchProcessButton from './BatchProcessButton';
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
    const [showUnembeddedOnly, setShowUnembeddedOnly] = useState(false);

    const isUnanalyzed = (d: ClientProjectData) => d.type === 'image' && !(d.analysis?.description && d.analysis.description.trim().length > 0);

    const isUnembedded = (d: ClientProjectData) => {
        return !(d.embedding && Array.isArray(d.embedding) && d.embedding.length > 0 && d.embedding.every(val => typeof val === 'number'));
    };

    const filtered = useMemo(() => {
        let result = data;
        if (showUnanalyzedOnly) {
            result = result.filter(isUnanalyzed);
        }
        if (showUnembeddedOnly) {
            result = result.filter(isUnembedded);
        }
        return result;
    }, [data, showUnanalyzedOnly, showUnembeddedOnly]);

    const unanalyzedCount = useMemo(() => data.filter(isUnanalyzed).length, [data]);
    const unembeddedCount = useMemo(() => data.filter(isUnembedded).length, [data]);
    const unembeddedItems = useMemo(() => data.filter(isUnembedded), [data]);

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
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setShowUnanalyzedOnly(v => !v)}
                        className={`px-3 py-1 text-xs rounded border ${showUnanalyzedOnly ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'}`}
                        title="Show only items without analysis"
                    >
                        <Filter className="h-3 w-3 inline mr-1" />
                        Unanalyzed only
                    </button>
                    <button
                        onClick={() => setShowUnembeddedOnly(v => !v)}
                        className={`px-3 py-1 text-xs rounded border ${showUnembeddedOnly ? 'bg-green-600 text-white border-green-600' : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'}`}
                        title="Show only items without embeddings"
                    >
                        <Filter className="h-3 w-3 inline mr-1" />
                        Unembedded only
                    </button>
                    {unanalyzedCount > 0 && (
                        <button
                            onClick={handleBulkAnalyze}
                            className="px-3 py-1 text-xs rounded bg-amber-500 text-white hover:bg-amber-600"
                            title="Analyze all filtered images and generate tags/description"
                        >
                            <Wand2 className="h-3 w-3 inline mr-1" />
                            Analyze {unanalyzedCount} images
                        </button>
                    )}
                    {unembeddedCount > 0 && (
                        <div className="inline-block">
                            <BatchProcessButton
                                unprocessedItems={unembeddedItems}
                                asIcon={false}
                            />
                        </div>
                    )}
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