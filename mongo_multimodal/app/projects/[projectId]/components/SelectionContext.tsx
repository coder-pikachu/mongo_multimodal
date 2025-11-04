'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ClientProjectData, SearchResult } from '@/app/types/clientTypes';

/**
 * SelectionContext - Multi-select state management for agent-centric UI
 * Replaces SearchResultContext with support for multiple selected items
 */

type SelectableItem = ClientProjectData | SearchResult;

interface SelectionContextType {
  // Multi-select state
  selectedItems: SelectableItem[];

  // Selection actions
  addItem: (item: SelectableItem) => void;
  removeItem: (id: string) => void;
  toggleItem: (item: SelectableItem) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;

  // Agent integration
  feedToAgent: () => void;
  agentContext: string | null;  // Pre-formatted context string for agent
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedItems, setSelectedItems] = useState<SelectableItem[]>([]);
  const [agentContext, setAgentContext] = useState<string | null>(null);

  const addItem = useCallback((item: SelectableItem) => {
    setSelectedItems((prev) => {
      // Check if already exists
      if (prev.some((i) => i._id === item._id)) {
        return prev;
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setSelectedItems((prev) => prev.filter((item) => item._id !== id));
  }, []);

  const toggleItem = useCallback((item: SelectableItem) => {
    setSelectedItems((prev) => {
      const exists = prev.some((i) => i._id === item._id);
      if (exists) {
        return prev.filter((i) => i._id !== item._id);
      }
      return [...prev, item];
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems([]);
    setAgentContext(null);
  }, []);

  const isSelected = useCallback((id: string) => {
    return selectedItems.some((item) => item._id === id);
  }, [selectedItems]);

  const feedToAgent = useCallback(() => {
    if (selectedItems.length === 0) {
      setAgentContext(null);
      return;
    }

    // Create context string for agent
    let context = '';

    if (selectedItems.length === 1) {
      const item = selectedItems[0];
      context = `I've selected "${item.metadata?.filename || 'an item'}" for you to analyze. `;

      if (item.analysis?.description) {
        context += `It contains: ${item.analysis.description}`;
      }
    } else {
      context = `I've selected ${selectedItems.length} items for you to analyze:\n`;
      selectedItems.forEach((item, index) => {
        context += `\n${index + 1}. ${item.metadata?.filename || 'Unknown'}`;
        if (item.analysis?.description) {
          context += ` - ${item.analysis.description}`;
        }
      });
    }

    setAgentContext(context);
  }, [selectedItems]);

  return (
    <SelectionContext.Provider
      value={{
        selectedItems,
        addItem,
        removeItem,
        toggleItem,
        clearSelection,
        isSelected,
        feedToAgent,
        agentContext,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const context = useContext(SelectionContext);
  if (context === undefined) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
}
