import React, { useState, useRef, type KeyboardEvent } from 'react';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  defaultTabId?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  defaultTabId,
  onChange,
  className = '',
}) => {
  const initialTab = defaultTabId || (items.length > 0 ? items[0].id : '');
  const [activeTabId, setActiveTabId] = useState<string>(initialTab);
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const handleTabClick = (id: string) => {
    setActiveTabId(id);
    if (onChange) {
      onChange(id);
    }
  };

  const enabledItems = items.filter((item) => !item.disabled);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentId: string) => {
    const currentIndex = enabledItems.findIndex((item) => item.id === currentId);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % enabledItems.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + enabledItems.length) % enabledItems.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = enabledItems.length - 1;
    }

    if (nextIndex !== currentIndex) {
      const nextTab = enabledItems[nextIndex];
      handleTabClick(nextTab.id);
      tabRefs.current[nextTab.id]?.focus();
    }
  };

  const activeItem = items.find((item) => item.id === activeTabId);

  return (
    <div className={`w-full ${className}`}>
      {/* Lista de pestañas */}
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="flex border-b border-slate-200 gap-2"
      >
        {items.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              disabled={tab.disabled}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              onClick={() => !tab.disabled && handleTabClick(tab.id)}
              onKeyDown={(e) => !tab.disabled && handleKeyDown(e, tab.id)}
              className={`px-4 py-2 text-base leading-6 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-t-md font-semibold ${
                isActive
                  ? 'border-b-2 border-primary text-primary bg-blue-50/50'
                  : 'text-slate-600 hover:text-neutral-dark hover:bg-slate-100'
              } ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Panel de contenido activo */}
      {activeItem && (
        <div
          id={`panel-${activeItem.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeItem.id}`}
          tabIndex={0}
          className="py-4 text-base leading-6 text-neutral-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-b-md"
        >
          {activeItem.content}
        </div>
      )}
    </div>
  );
};