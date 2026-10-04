import React, { useEffect, useState } from 'react';
import { 
  Users, 
  UserCheck, 
  Edit3, 
  Check, 
  X, 
  RefreshCw,
  Info 
} from 'lucide-react';
import type { Person, PhotoSummary } from '../types';
import { getPersons, updatePersonName, getPhotoFileUrl, getPhotoById } from '../api';
import { PhotoModal } from '../components/PhotoModal';

export const PeoplePage: React.FC = () => {
  const [persons, setPersons] = useState<Person[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState<string>('');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [modalPhoto, setModalPhoto] = useState<PhotoSummary | null>(null);

  const loadPersons = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPersons();
      setPersons(data.persons);
      setTotal(data.total);
    } catch (err: unknown) {
      console.error('Failed to load face clusters:', err);
      const errObj = err as { message?: string };
      setError(errObj.message || 'Unable to retrieve person clusters.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersons();
  }, []);

  const handleStartRename = (person: Person, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPersonId(person.person_id);
    setEditNameValue(person.name || '');
  };

  const handleSaveRename = async (personId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editNameValue.trim()) return;

    try {
      await updatePersonName(personId, editNameValue.trim());
      setPersons((prev) =>
        prev.map((p) =>
          p.person_id === personId ? { ...p, name: editNameValue.trim() } : p
        )
      );
      setEditingPersonId(null);
    } catch (err) {
      console.error('Rename failed:', err);
    }
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPersonId(null);
  };

  const handleViewPersonPhoto = async (photoId: string) => {
    try {
      const detail = await getPhotoById(photoId);
      setModalPhoto({
        id: detail.id,
        filename: detail.filename,
        category: detail.category,
        taken_at: detail.taken_at,
        width: detail.width,
        height: detail.height,
        is_duplicate: detail.is_duplicate,
        tags: detail.tags,
      });
    } catch (err) {
      console.error('Failed to fetch photo detail:', err);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>People & Facial Recognition</span>
            <span className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
              {total} Detected {total === 1 ? 'Person' : 'People'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Face appearance embeddings clustered using 128-dimensional facial landmark vectors
          </p>
        </div>

        <button
          onClick={loadPersons}
          disabled={loading}
          className="p-2 bg-white text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs self-start"
          title="Refresh people"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-64 bg-white rounded-3xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 bg-white rounded-3xl border border-rose-200 text-center max-w-md mx-auto">
          <p className="text-sm font-semibold text-slate-800">Failed to load people</p>
          <p className="text-xs text-slate-500 mt-1">{error}</p>
        </div>
      ) : persons.length === 0 ? (
        <div className="py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-center max-w-xl mx-auto px-6 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-2xs">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No Face Clusters Detected Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mb-6">
            Facial recognition automatically groups photos of the same individual together. When images with visible human faces are processed with face recognition models enabled, clusters will appear here for naming and organization.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Face clustering pipeline is active and awaiting facial landmark inputs</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {persons.map((person) => {
            const isEditing = editingPersonId === person.person_id;
            const primaryPhotoId = person.sample_photo_ids[0];

            return (
              <div
                key={person.person_id}
                onClick={() => setSelectedPerson(person)}
                className="group bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs hover:shadow-card hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col items-center text-center select-none"
              >
                <div className="w-28 h-28 rounded-full overflow-hidden bg-slate-100 border-2 border-white shadow-md relative mb-3 group-hover:scale-105 transition-transform duration-200">
                  {primaryPhotoId ? (
                    <img
                      src={getPhotoFileUrl(primaryPhotoId)}
                      alt={person.name || 'Person'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Users className="w-10 h-10" />
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-1 my-1 w-full" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      placeholder="Enter name..."
                      autoFocus
                      className="w-full text-xs px-2 py-1 border border-brand-500 rounded-lg outline-none text-slate-800"
                    />
                    <button
                      onClick={(e) => handleSaveRename(person.person_id, e)}
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleCancelRename}
                      className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 w-full">
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {person.name || 'Unnamed Person'}
                    </h4>
                    <button
                      onClick={(e) => handleStartRename(person, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 transition-opacity"
                      title="Name this person"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <span className="text-[11px] text-slate-400 mt-0.5">
                  {person.photo_count} {person.photo_count === 1 ? 'photo' : 'photos'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {selectedPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" 
            onClick={() => setSelectedPerson(null)} 
          />
          <div className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedPerson.name || 'Unnamed Person'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedPerson.photo_count} associated photos in cluster
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPerson(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-1">
              {selectedPerson.sample_photo_ids.map((photoId) => (
                <div
                  key={photoId}
                  onClick={() => handleViewPersonPhoto(photoId)}
                  className="aspect-square rounded-2xl overflow-hidden bg-slate-100 cursor-pointer hover:scale-105 transition-transform"
                >
                  <img
                    src={getPhotoFileUrl(photoId)}
                    alt="Person occurrence"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <PhotoModal
        photo={modalPhoto}
        onClose={() => setModalPhoto(null)}
      />
    </div>
  );
};
