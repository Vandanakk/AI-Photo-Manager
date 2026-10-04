import React, { useState } from 'react';
import type { NavigationTab } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { PhotosPage } from './pages/PhotosPage';
import { SearchPage } from './pages/SearchPage';
import { DuplicatesPage } from './pages/DuplicatesPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { PeoplePage } from './pages/PeoplePage';
import { UploadModal } from './components/UploadModal';
import { SettingsModal } from './components/SettingsModal';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('photos');
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [galleryRefreshKey, setGalleryRefreshKey] = useState<number>(0);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentTab('search');
  };

  const handleSelectCategory = (category: string) => {
    setSelectedCategoryFilter(category);
    setCurrentTab('photos');
  };

  const handleUploadSuccess = () => {
    setGalleryRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'photos') {
            setSelectedCategoryFilter(null);
          }
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          currentTab={currentTab}
          onOpenUpload={() => setIsUploadOpen(true)}
          onSearch={handleSearch}
          initialSearchQuery={searchQuery}
        />

        <main className="flex-1 overflow-y-auto bg-slate-50">
          {currentTab === 'photos' && (
            <PhotosPage
              key={galleryRefreshKey}
              onOpenUpload={() => setIsUploadOpen(true)}
              selectedCategoryFilter={selectedCategoryFilter}
              onClearCategoryFilter={() => setSelectedCategoryFilter(null)}
            />
          )}

          {currentTab === 'search' && (
            <SearchPage
              initialQuery={searchQuery}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          )}

          {currentTab === 'people' && <PeoplePage />}

          {currentTab === 'duplicates' && <DuplicatesPage />}

          {currentTab === 'categories' && (
            <CategoriesPage onSelectCategory={handleSelectCategory} />
          )}
        </main>
      </div>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default App;
