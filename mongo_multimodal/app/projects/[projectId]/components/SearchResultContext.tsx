'use client'
import { createContext, useState, useContext, ReactNode } from 'react';
import { ClientProjectData, SearchResult } from '@/types/clientTypes';

interface SearchResultContextType {
    selectedResult: ClientProjectData | SearchResult | null;
    setSelectedResult: (result: ClientProjectData | SearchResult | null) => void;
}

const SearchResultContext = createContext<SearchResultContextType | undefined>(undefined);

export const SearchResultProvider = ({ children }: { children: ReactNode }) => {
    const [selectedResult, setSelectedResult] = useState<ClientProjectData | SearchResult | null>(null);

    return (
        <SearchResultContext.Provider value={{ selectedResult, setSelectedResult }}>
            {children}
        </SearchResultContext.Provider>
    );
};

export const useSearchResult = () => {
    const context = useContext(SearchResultContext);
    if (context === undefined) {
        throw new Error('useSearchResult must be used within a SearchResultProvider');
    }
    return context;
};