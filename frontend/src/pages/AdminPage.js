import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import Layout from '../components/Layout';
import { 
  MusicNote, Users, Storefront, Upload, Plus, 
  Trash, PencilSimple, Eye, EyeSlash, MagnifyingGlass
} from '@phosphor-icons/react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';

export default function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'mixes');
  
  // Mixes state
  const [mixes, setMixes] = useState([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    artist: '',
    bpm: '',
    duration: '',
    genre: '',
    description: ''
  });
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleteMix, setDeleteMix] = useState(null);

  // Instructors state
  const [instructors, setInstructors] = useState([]);
  const [studios, setStudios] = useState([]);
  const [showInstructorDialog, setShowInstructorDialog] = useState(false);
  const [instructorForm, setInstructorForm] = useState({
    name: '',
    email: '',
    password: '',
    studio_id: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [creatingInstructor, setCreatingInstructor] = useState(false);
  const [deleteInstructor, setDeleteInstructor] = useState(null);

  // Studios state
  const [showStudioDialog, setShowStudioDialog] = useState(false);
  const [studioForm, setStudioForm] = useState({
    name: '',
    address: '',
    phone: ''
  });
  const [creatingStudio, setCreatingStudio] = useState(false);
  const [deleteStudio, setDeleteStudio] = useState(null);

  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [mixesRes, instructorsRes, studiosRes] = await Promise.all([
        axios.get(`${API}/mixes`),
        axios.get(`${API}/admin/instructors`),
        axios.get(`${API}/studios`)
      ]);
      setMixes(mixesRes.data);
      setInstructors(instructorsRes.data);
      setStudios(studiosRes.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTabChange = (value) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  // Mix upload handler
  const handleUploadMix = async () => {
    if (!audioFile) {
      toast.error('Selecciona un archivo de audio');
      return;
    }

    if (!uploadForm.name || !uploadForm.artist || !uploadForm.bpm || !uploadForm.duration || !uploadForm.genre) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      if (coverFile) {
        formData.append('cover', coverFile);
      }

      const queryParams = new URLSearchParams({
        name: uploadForm.name,
        artist: uploadForm.artist,
        bpm: uploadForm.bpm,
        duration: uploadForm.duration,
        genre: uploadForm.genre,
        ...(uploadForm.description && { description: uploadForm.description })
      });

      await axios.post(`${API}/mixes?${queryParams.toString()}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Mix subido exitosamente');
      setShowUploadDialog(false);
      resetUploadForm();
      fetchData();
    } catch (error) {
      toast.error('Error al subir el mix');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadForm({ name: '', artist: '', bpm: '', duration: '', genre: '', description: '' });
    setAudioFile(null);
    setCoverFile(null);
  };

  const handleDeleteMix = async () => {
    if (!deleteMix) return;
    try {
      await axios.delete(`${API}/mixes/${deleteMix.mix_id}`);
      toast.success('Mix eliminado');
      setDeleteMix(null);
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar el mix');
    }
  };

  // Instructor handlers
  const handleCreateInstructor = async () => {
    if (!instructorForm.name || !instructorForm.email || !instructorForm.password) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    setCreatingInstructor(true);
    try {
      await axios.post(`${API}/admin/instructors`, instructorForm);
      toast.success('Instructor creado exitosamente');
      setShowInstructorDialog(false);
      setInstructorForm({ name: '', email: '', password: '', studio_id: '' });
      fetchData();
    } catch (error) {
      const detail = error.response?.data?.detail;
      toast.error(detail || 'Error al crear el instructor');
    } finally {
      setCreatingInstructor(false);
    }
  };

  const handleDeleteInstructor = async () => {
    if (!deleteInstructor) return;
    try {
      await axios.delete(`${API}/admin/instructors/${deleteInstructor.user_id}`);
      toast.success('Instructor eliminado');
      setDeleteInstructor(null);
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar el instructor');
    }
  };

  // Studio handlers
  const handleCreateStudio = async () => {
    if (!studioForm.name) {
      toast.error('El nombre es requerido');
      return;
    }

    setCreatingStudio(true);
    try {
      await axios.post(`${API}/studios`, studioForm);
      toast.success('Estudio creado exitosamente');
      setShowStudioDialog(false);
      setStudioForm({ name: '', address: '', phone: '' });
      fetchData();
    } catch (error) {
      toast.error('Error al crear el estudio');
    } finally {
      setCreatingStudio(false);
    }
  };

  const handleDeleteStudio = async () => {
    if (!deleteStudio) return;
    try {
      await axios.delete(`${API}/studios/${deleteStudio.studio_id}`);
      toast.success('Estudio desactivado');
      setDeleteStudio(null);
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar el estudio');
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#007AFF]"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6" data-testid="admin-page">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Panel de Administración
          </h1>
          <p className="text-[#A1A1AA]">
            Gestiona mixes, instructores y estudios
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="bg-[#141414] border border-[#27272A] p-1">
            <TabsTrigger 
              value="mixes" 
              className="data-[state=active]:bg-[#007AFF] data-[state=active]:text-white"
              data-testid="tab-mixes"
            >
              <MusicNote size={18} className="mr-2" />
              Mixes ({mixes.length})
            </TabsTrigger>
            <TabsTrigger 
              value="instructors" 
              className="data-[state=active]:bg-[#007AFF] data-[state=active]:text-white"
              data-testid="tab-instructors"
            >
              <Users size={18} className="mr-2" />
              Instructores ({instructors.length})
            </TabsTrigger>
            <TabsTrigger 
              value="studios" 
              className="data-[state=active]:bg-[#007AFF] data-[state=active]:text-white"
              data-testid="tab-studios"
            >
              <Storefront size={18} className="mr-2" />
              Estudios ({studios.length})
            </TabsTrigger>
          </TabsList>

          {/* Mixes Tab */}
          <TabsContent value="mixes" className="mt-6">
            <div className="bg-[#141414] border border-[#27272A] rounded-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Catálogo de Mixes
                </h2>
                <Button
                  onClick={() => setShowUploadDialog(true)}
                  className="bg-[#007AFF] hover:bg-[#3395FF] text-white font-bold"
                  data-testid="upload-mix-btn"
                >
                  <Upload size={18} className="mr-2" />
                  Subir mix
                </Button>
              </div>

              {mixes.length === 0 ? (
                <div className="text-center py-12">
                  <MusicNote size={48} className="mx-auto text-[#71717A] mb-4" />
                  <p className="text-[#A1A1AA] mb-4">No hay mixes en el catálogo</p>
                  <Button
                    onClick={() => setShowUploadDialog(true)}
                    className="bg-[#007AFF] hover:bg-[#3395FF]"
                  >
                    Subir primer mix
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#27272A] text-xs uppercase tracking-[0.2em] font-bold text-[#71717A]">
                        <th className="text-left py-3 px-4">Título</th>
                        <th className="text-left py-3 px-4">Artista</th>
                        <th className="text-left py-3 px-4">Género</th>
                        <th className="text-center py-3 px-4">BPM</th>
                        <th className="text-center py-3 px-4">Duración</th>
                        <th className="text-right py-3 px-4">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#27272A]">
                      {mixes.map((mix) => (
                        <tr key={mix.mix_id} className="hover:bg-[#1F1F1F] transition-colors" data-testid={`admin-mix-${mix.mix_id}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-[#1F1F1F] flex items-center justify-center flex-shrink-0">
                                {mix.cover_path ? (
                                  <img
                                    src={`${API}/mixes/${mix.mix_id}/cover`}
                                    alt={mix.name}
                                    className="w-full h-full object-cover rounded"
                                  />
                                ) : (
                                  <MusicNote size={20} className="text-[#71717A]" />
                                )}
                              </div>
                              <span className="font-semibold text-white truncate">{mix.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[#A1A1AA]">{mix.artist}</td>
                          <td className="py-3 px-4 text-[#A1A1AA]">{mix.genre}</td>
                          <td className="py-3 px-4 text-center text-[#A1A1AA]">{mix.bpm}</td>
                          <td className="py-3 px-4 text-center text-[#A1A1AA]">{formatDuration(mix.duration)}</td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteMix(mix)}
                              className="text-[#71717A] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10"
                              data-testid={`delete-mix-btn-${mix.mix_id}`}
                            >
                              <Trash size={16} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Instructors Tab */}
          <TabsContent value="instructors" className="mt-6">
            <div className="bg-[#141414] border border-[#27272A] rounded-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Instructores
                </h2>
                <Button
                  onClick={() => setShowInstructorDialog(true)}
                  className="bg-[#007AFF] hover:bg-[#3395FF] text-white font-bold"
                  data-testid="add-instructor-btn"
                >
                  <Plus size={18} className="mr-2" />
                  Agregar instructor
                </Button>
              </div>

              {instructors.length === 0 ? (
                <div className="text-center py-12">
                  <Users size={48} className="mx-auto text-[#71717A] mb-4" />
                  <p className="text-[#A1A1AA] mb-4">No hay instructores registrados</p>
                  <Button
                    onClick={() => setShowInstructorDialog(true)}
                    className="bg-[#007AFF] hover:bg-[#3395FF]"
                  >
                    Agregar primer instructor
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#27272A] text-xs uppercase tracking-[0.2em] font-bold text-[#71717A]">
                        <th className="text-left py-3 px-4">Nombre</th>
                        <th className="text-left py-3 px-4">Email</th>
                        <th className="text-left py-3 px-4">Estudio</th>
                        <th className="text-left py-3 px-4">Fecha de registro</th>
                        <th className="text-right py-3 px-4">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#27272A]">
                      {instructors.map((instructor) => (
                        <tr key={instructor.user_id} className="hover:bg-[#1F1F1F] transition-colors" data-testid={`admin-instructor-${instructor.user_id}`}>
                          <td className="py-3 px-4 font-semibold text-white">{instructor.name}</td>
                          <td className="py-3 px-4 text-[#A1A1AA]">{instructor.email}</td>
                          <td className="py-3 px-4 text-[#A1A1AA]">
                            {studios.find(s => s.studio_id === instructor.studio_id)?.name || '-'}
                          </td>
                          <td className="py-3 px-4 text-[#A1A1AA]">
                            {new Date(instructor.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteInstructor(instructor)}
                              className="text-[#71717A] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10"
                              data-testid={`delete-instructor-btn-${instructor.user_id}`}
                            >
                              <Trash size={16} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Studios Tab */}
          <TabsContent value="studios" className="mt-6">
            <div className="bg-[#141414] border border-[#27272A] rounded-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Estudios / Sucursales
                </h2>
                <Button
                  onClick={() => setShowStudioDialog(true)}
                  className="bg-[#007AFF] hover:bg-[#3395FF] text-white font-bold"
                  data-testid="add-studio-btn"
                >
                  <Plus size={18} className="mr-2" />
                  Agregar estudio
                </Button>
              </div>

              {studios.length === 0 ? (
                <div className="text-center py-12">
                  <Storefront size={48} className="mx-auto text-[#71717A] mb-4" />
                  <p className="text-[#A1A1AA] mb-4">No hay estudios registrados</p>
                  <Button
                    onClick={() => setShowStudioDialog(true)}
                    className="bg-[#007AFF] hover:bg-[#3395FF]"
                  >
                    Agregar primer estudio
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {studios.map((studio) => (
                    <div
                      key={studio.studio_id}
                      className="bg-[#1F1F1F] border border-[#27272A] rounded-md p-4 hover-card group relative"
                      data-testid={`admin-studio-${studio.studio_id}`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-md bg-[#007AFF]/20 flex items-center justify-center">
                          <Storefront size={24} className="text-[#007AFF]" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{studio.name}</h3>
                          <p className="text-sm text-[#71717A]">
                            {instructors.filter(i => i.studio_id === studio.studio_id).length} instructores
                          </p>
                        </div>
                      </div>
                      
                      {studio.address && (
                        <p className="text-sm text-[#A1A1AA] mb-1">{studio.address}</p>
                      )}
                      {studio.phone && (
                        <p className="text-sm text-[#71717A]">{studio.phone}</p>
                      )}

                      <button
                        onClick={() => setDeleteStudio(studio)}
                        className="absolute top-2 right-2 p-2 rounded-md bg-[#27272A] text-[#71717A] hover:text-[#FF3B30] hover:bg-[#FF3B30]/20 opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`delete-studio-btn-${studio.studio_id}`}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Upload Mix Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="bg-[#141414] border-[#27272A] text-white max-w-lg">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }}>
                Subir nuevo mix
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                    Nombre *
                  </label>
                  <Input
                    value={uploadForm.name}
                    onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                    placeholder="Nombre del mix"
                    className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white"
                    data-testid="mix-name-input"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                    Artista *
                  </label>
                  <Input
                    value={uploadForm.artist}
                    onChange={(e) => setUploadForm({ ...uploadForm, artist: e.target.value })}
                    placeholder="Nombre del artista o DJ"
                    className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white"
                    data-testid="mix-artist-input"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                    BPM *
                  </label>
                  <Input
                    type="number"
                    value={uploadForm.bpm}
                    onChange={(e) => setUploadForm({ ...uploadForm, bpm: e.target.value })}
                    placeholder="120"
                    className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white"
                    data-testid="mix-bpm-input"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                    Duración (seg) *
                  </label>
                  <Input
                    type="number"
                    value={uploadForm.duration}
                    onChange={(e) => setUploadForm({ ...uploadForm, duration: e.target.value })}
                    placeholder="180"
                    className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white"
                    data-testid="mix-duration-input"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                    Género *
                  </label>
                  <Input
                    value={uploadForm.genre}
                    onChange={(e) => setUploadForm({ ...uploadForm, genre: e.target.value })}
                    placeholder="House, EDM, Hip-Hop, etc."
                    className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white"
                    data-testid="mix-genre-input"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                    Descripción
                  </label>
                  <Input
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    placeholder="Descripción opcional..."
                    className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white"
                    data-testid="mix-description-input"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                    Archivo de audio *
                  </label>
                  <Input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setAudioFile(e.target.files[0])}
                    className="bg-[#1F1F1F] border-[#27272A] text-white file:bg-[#007AFF] file:text-white file:border-0 file:rounded file:mr-3 file:px-3 file:py-1"
                    data-testid="mix-audio-input"
                  />
                  {audioFile && (
                    <p className="text-sm text-[#34C759] mt-1">{audioFile.name}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                    Imagen de portada
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCoverFile(e.target.files[0])}
                    className="bg-[#1F1F1F] border-[#27272A] text-white file:bg-[#1F1F1F] file:text-white file:border file:border-[#27272A] file:rounded file:mr-3 file:px-3 file:py-1"
                    data-testid="mix-cover-input"
                  />
                  {coverFile && (
                    <p className="text-sm text-[#34C759] mt-1">{coverFile.name}</p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => { setShowUploadDialog(false); resetUploadForm(); }}
                className="bg-[#1F1F1F] border-[#27272A] text-white hover:bg-[#27272A]"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUploadMix}
                disabled={uploading}
                className="bg-[#007AFF] hover:bg-[#3395FF]"
                data-testid="confirm-upload-mix-btn"
              >
                {uploading ? 'Subiendo...' : 'Subir mix'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Instructor Dialog */}
        <Dialog open={showInstructorDialog} onOpenChange={setShowInstructorDialog}>
          <DialogContent className="bg-[#141414] border-[#27272A] text-white">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }}>
                Agregar instructor
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                  Nombre *
                </label>
                <Input
                  value={instructorForm.name}
                  onChange={(e) => setInstructorForm({ ...instructorForm, name: e.target.value })}
                  placeholder="Nombre completo"
                  className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white"
                  data-testid="instructor-name-input"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                  Email *
                </label>
                <Input
                  type="email"
                  value={instructorForm.email}
                  onChange={(e) => setInstructorForm({ ...instructorForm, email: e.target.value })}
                  placeholder="instructor@email.com"
                  className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white"
                  data-testid="instructor-email-input"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                  Contraseña *
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={instructorForm.password}
                    onChange={(e) => setInstructorForm({ ...instructorForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white pr-10"
                    data-testid="instructor-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-white"
                  >
                    {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                  Estudio (opcional)
                </label>
                <Select
                  value={instructorForm.studio_id}
                  onValueChange={(value) => setInstructorForm({ ...instructorForm, studio_id: value })}
                >
                  <SelectTrigger className="bg-[#1F1F1F] border-[#27272A] text-white" data-testid="instructor-studio-select">
                    <SelectValue placeholder="Seleccionar estudio" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1F1F1F] border-[#27272A]">
                    <SelectItem value="" className="text-white">Sin estudio</SelectItem>
                    {studios.map((studio) => (
                      <SelectItem key={studio.studio_id} value={studio.studio_id} className="text-white">
                        {studio.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => setShowInstructorDialog(false)}
                className="bg-[#1F1F1F] border-[#27272A] text-white hover:bg-[#27272A]"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateInstructor}
                disabled={creatingInstructor}
                className="bg-[#007AFF] hover:bg-[#3395FF]"
                data-testid="confirm-add-instructor-btn"
              >
                {creatingInstructor ? 'Creando...' : 'Agregar instructor'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Studio Dialog */}
        <Dialog open={showStudioDialog} onOpenChange={setShowStudioDialog}>
          <DialogContent className="bg-[#141414] border-[#27272A] text-white">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }}>
                Agregar estudio
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                  Nombre *
                </label>
                <Input
                  value={studioForm.name}
                  onChange={(e) => setStudioForm({ ...studioForm, name: e.target.value })}
                  placeholder="Nombre del estudio"
                  className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white"
                  data-testid="studio-name-input"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                  Dirección
                </label>
                <Input
                  value={studioForm.address}
                  onChange={(e) => setStudioForm({ ...studioForm, address: e.target.value })}
                  placeholder="Dirección del estudio"
                  className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white"
                  data-testid="studio-address-input"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                  Teléfono
                </label>
                <Input
                  value={studioForm.phone}
                  onChange={(e) => setStudioForm({ ...studioForm, phone: e.target.value })}
                  placeholder="+1 234 567 8900"
                  className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white"
                  data-testid="studio-phone-input"
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => setShowStudioDialog(false)}
                className="bg-[#1F1F1F] border-[#27272A] text-white hover:bg-[#27272A]"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateStudio}
                disabled={creatingStudio}
                className="bg-[#007AFF] hover:bg-[#3395FF]"
                data-testid="confirm-add-studio-btn"
              >
                {creatingStudio ? 'Creando...' : 'Agregar estudio'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Mix Confirmation */}
        <AlertDialog open={!!deleteMix} onOpenChange={() => setDeleteMix(null)}>
          <AlertDialogContent className="bg-[#141414] border-[#27272A]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">¿Eliminar mix?</AlertDialogTitle>
              <AlertDialogDescription className="text-[#A1A1AA]">
                Esta acción desactivará el mix "{deleteMix?.name}" del catálogo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-[#1F1F1F] border-[#27272A] text-white hover:bg-[#27272A]">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteMix} className="bg-[#FF3B30] hover:bg-[#FF6159]">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Instructor Confirmation */}
        <AlertDialog open={!!deleteInstructor} onOpenChange={() => setDeleteInstructor(null)}>
          <AlertDialogContent className="bg-[#141414] border-[#27272A]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">¿Eliminar instructor?</AlertDialogTitle>
              <AlertDialogDescription className="text-[#A1A1AA]">
                Se eliminará permanentemente la cuenta de "{deleteInstructor?.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-[#1F1F1F] border-[#27272A] text-white hover:bg-[#27272A]">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteInstructor} className="bg-[#FF3B30] hover:bg-[#FF6159]">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Studio Confirmation */}
        <AlertDialog open={!!deleteStudio} onOpenChange={() => setDeleteStudio(null)}>
          <AlertDialogContent className="bg-[#141414] border-[#27272A]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">¿Desactivar estudio?</AlertDialogTitle>
              <AlertDialogDescription className="text-[#A1A1AA]">
                Se desactivará el estudio "{deleteStudio?.name}". Los instructores asignados no se verán afectados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-[#1F1F1F] border-[#27272A] text-white hover:bg-[#27272A]">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteStudio} className="bg-[#FF3B30] hover:bg-[#FF6159]">
                Desactivar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
