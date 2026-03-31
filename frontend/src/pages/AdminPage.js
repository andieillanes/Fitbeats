import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import Layout from '../components/Layout';
import { 
  MusicNote, Users, Storefront, Upload, Plus, 
  Trash, PencilSimple, Eye, EyeSlash, Disc, Calendar
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
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'albums');
  
  // Albums state
  const [albums, setAlbums] = useState([]);
  const [showAlbumDialog, setShowAlbumDialog] = useState(false);
  const [albumForm, setAlbumForm] = useState({
    name: '',
    artist: '',
    year: new Date().getFullYear(),
    description: ''
  });
  const [albumCoverFile, setAlbumCoverFile] = useState(null);
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [deleteAlbum, setDeleteAlbum] = useState(null);

  // Mixes state
  const [mixes, setMixes] = useState([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    artist: '',
    bpm: '',
    duration: '',
    genre: '',
    album_id: '',
    description: ''
  });
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleteMix, setDeleteMix] = useState(null);

  // Batch upload state
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchForm, setBatchForm] = useState({
    artist: '',
    albumMode: 'existing', // 'existing' or 'new'
    album_id: '',
    new_album_name: '',
    new_album_year: new Date().getFullYear()
  });
  const [batchAudioFiles, setBatchAudioFiles] = useState([]);
  const [batchCoverFile, setBatchCoverFile] = useState(null);
  const [batchUploading, setBatchUploading] = useState(false);

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
      const [albumsRes, mixesRes, instructorsRes, studiosRes] = await Promise.all([
        axios.get(`${API}/albums`),
        axios.get(`${API}/mixes`),
        axios.get(`${API}/admin/instructors`),
        axios.get(`${API}/studios`)
      ]);
      setAlbums(albumsRes.data);
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

  // Album handlers
  const handleCreateAlbum = async () => {
    if (!albumForm.name || !albumForm.artist || !albumForm.year) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    setCreatingAlbum(true);
    try {
      const formData = new FormData();
      if (albumCoverFile) {
        formData.append('cover', albumCoverFile);
      }

      const queryParams = new URLSearchParams({
        name: albumForm.name,
        artist: albumForm.artist,
        year: albumForm.year.toString(),
        ...(albumForm.description && { description: albumForm.description })
      });

      await axios.post(`${API}/albums?${queryParams.toString()}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Álbum creado exitosamente');
      setShowAlbumDialog(false);
      setAlbumForm({ name: '', artist: '', year: new Date().getFullYear(), description: '' });
      setAlbumCoverFile(null);
      fetchData();
    } catch (error) {
      toast.error('Error al crear el álbum');
      console.error(error);
    } finally {
      setCreatingAlbum(false);
    }
  };

  const handleDeleteAlbum = async () => {
    if (!deleteAlbum) return;
    try {
      await axios.delete(`${API}/albums/${deleteAlbum.album_id}`);
      toast.success('Álbum eliminado');
      setDeleteAlbum(null);
      fetchData();
    } catch (error) {
      const detail = error.response?.data?.detail;
      toast.error(detail || 'Error al eliminar el álbum');
    }
  };

  // Mix upload handler
  const handleUploadMix = async () => {
    if (!audioFile) {
      toast.error('Selecciona un archivo de audio');
      return;
    }

    if (!uploadForm.name || !uploadForm.artist || !uploadForm.album_id) {
      toast.error('Completa nombre, artista y álbum');
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
        album_id: uploadForm.album_id,
        ...(uploadForm.bpm && { bpm: uploadForm.bpm }),
        ...(uploadForm.duration && { duration: uploadForm.duration }),
        ...(uploadForm.genre && { genre: uploadForm.genre }),
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
    setUploadForm({ name: '', artist: '', bpm: '', duration: '', genre: '', album_id: '', description: '' });
    setAudioFile(null);
    setCoverFile(null);
  };

  // Batch upload handler
  const handleBatchUpload = async () => {
    if (batchAudioFiles.length === 0) {
      toast.error('Selecciona al menos un archivo de audio');
      return;
    }

    if (!batchForm.artist) {
      toast.error('El artista es requerido');
      return;
    }

    if (batchForm.albumMode === 'existing' && !batchForm.album_id) {
      toast.error('Selecciona un álbum existente');
      return;
    }

    if (batchForm.albumMode === 'new' && !batchForm.new_album_name) {
      toast.error('Ingresa el nombre del nuevo álbum');
      return;
    }

    setBatchUploading(true);
    try {
      const formData = new FormData();
      
      // Add all audio files
      for (const file of batchAudioFiles) {
        formData.append('audio_files', file);
      }
      
      // Add cover if creating new album
      if (batchForm.albumMode === 'new' && batchCoverFile) {
        formData.append('album_cover', batchCoverFile);
      }

      const queryParams = new URLSearchParams({
        artist: batchForm.artist,
        ...(batchForm.albumMode === 'existing' && { album_id: batchForm.album_id }),
        ...(batchForm.albumMode === 'new' && { 
          new_album_name: batchForm.new_album_name,
          new_album_year: batchForm.new_album_year.toString()
        })
      });

      const response = await axios.post(`${API}/mixes/batch?${queryParams.toString()}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const result = response.data;
      toast.success(`${result.created_mixes} mixes subidos al álbum "${result.album.name}"`);
      
      if (result.errors && result.errors.length > 0) {
        toast.error(`${result.errors.length} archivos fallaron`);
      }

      setShowBatchDialog(false);
      resetBatchForm();
      fetchData();
    } catch (error) {
      const detail = error.response?.data?.detail;
      toast.error(detail || 'Error al subir los mixes');
      console.error(error);
    } finally {
      setBatchUploading(false);
    }
  };

  const resetBatchForm = () => {
    setBatchForm({
      artist: '',
      albumMode: 'existing',
      album_id: '',
      new_album_name: '',
      new_album_year: new Date().getFullYear()
    });
    setBatchAudioFiles([]);
    setBatchCoverFile(null);
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
      const payload = {
        ...instructorForm,
        studio_id: instructorForm.studio_id === 'none' ? null : instructorForm.studio_id || null
      };
      await axios.post(`${API}/admin/instructors`, payload);
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
            Gestiona álbumes, mixes, instructores y estudios
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="bg-[#141414] border border-[#27272A] p-1">
            <TabsTrigger 
              value="albums" 
              className="data-[state=active]:bg-[#007AFF] data-[state=active]:text-white"
              data-testid="tab-albums"
            >
              <Disc size={18} className="mr-2" />
              Álbumes ({albums.length})
            </TabsTrigger>
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

          {/* Albums Tab */}
          <TabsContent value="albums" className="mt-6">
            <div className="bg-[#141414] border border-[#27272A] rounded-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Álbumes
                </h2>
                <Button
                  onClick={() => setShowAlbumDialog(true)}
                  className="bg-[#007AFF] hover:bg-[#3395FF] text-white font-bold"
                  data-testid="create-album-btn"
                >
                  <Plus size={18} className="mr-2" />
                  Crear álbum
                </Button>
              </div>

              {albums.length === 0 ? (
                <div className="text-center py-12">
                  <Disc size={48} className="mx-auto text-[#71717A] mb-4" />
                  <p className="text-[#A1A1AA] mb-4">No hay álbumes creados</p>
                  <p className="text-sm text-[#71717A] mb-4">Crea un álbum primero para poder subir mixes</p>
                  <Button
                    onClick={() => setShowAlbumDialog(true)}
                    className="bg-[#007AFF] hover:bg-[#3395FF]"
                  >
                    Crear primer álbum
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {albums.map((album) => (
                    <div
                      key={album.album_id}
                      className="bg-[#1F1F1F] border border-[#27272A] rounded-md p-4 hover-card group relative"
                      data-testid={`album-card-${album.album_id}`}
                    >
                      <div className="w-full aspect-square rounded-md bg-gradient-to-br from-[#007AFF] to-[#005ECA] flex items-center justify-center mb-3 overflow-hidden">
                        {album.cover_path ? (
                          <img
                            src={`${API}/albums/${album.album_id}/cover`}
                            alt={album.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Disc size={48} className="text-white" />
                        )}
                      </div>
                      <h3 className="font-semibold text-white truncate">{album.name}</h3>
                      <p className="text-sm text-[#A1A1AA] truncate">{album.artist}</p>
                      <div className="flex items-center gap-2 mt-2 text-sm text-[#71717A]">
                        <Calendar size={14} />
                        <span>{album.year}</span>
                        <span>•</span>
                        <span>{album.mix_count} mixes</span>
                      </div>

                      <button
                        onClick={() => setDeleteAlbum(album)}
                        className="absolute top-2 right-2 p-2 rounded-md bg-[#27272A] text-[#71717A] hover:text-[#FF3B30] hover:bg-[#FF3B30]/20 opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`delete-album-btn-${album.album_id}`}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Mixes Tab */}
          <TabsContent value="mixes" className="mt-6">
            <div className="bg-[#141414] border border-[#27272A] rounded-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Catálogo de Mixes
                </h2>
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setShowBatchDialog(true);
                    }}
                    variant="outline"
                    className="bg-[#1F1F1F] border-[#27272A] text-white hover:bg-[#27272A] font-bold"
                    data-testid="batch-upload-btn"
                  >
                    <Upload size={18} className="mr-2" />
                    Subir en lote
                  </Button>
                  <Button
                    onClick={() => {
                      if (albums.length === 0) {
                        toast.error('Debes crear un álbum primero');
                        setActiveTab('albums');
                        return;
                      }
                      setShowUploadDialog(true);
                    }}
                    className="bg-[#007AFF] hover:bg-[#3395FF] text-white font-bold"
                    data-testid="upload-mix-btn"
                  >
                    <Plus size={18} className="mr-2" />
                    Subir mix individual
                  </Button>
                </div>
              </div>

              {mixes.length === 0 ? (
                <div className="text-center py-12">
                  <MusicNote size={48} className="mx-auto text-[#71717A] mb-4" />
                  <p className="text-[#A1A1AA] mb-4">No hay mixes en el catálogo</p>
                  {albums.length === 0 ? (
                    <p className="text-sm text-[#71717A]">Crea un álbum primero para poder subir mixes</p>
                  ) : (
                    <div className="flex gap-3 justify-center">
                      <Button
                        onClick={() => setShowBatchDialog(true)}
                        variant="outline"
                        className="bg-[#1F1F1F] border-[#27272A] text-white hover:bg-[#27272A]"
                      >
                        Subir en lote
                      </Button>
                      <Button
                        onClick={() => setShowUploadDialog(true)}
                        className="bg-[#007AFF] hover:bg-[#3395FF]"
                      >
                        Subir mix individual
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#27272A] text-xs uppercase tracking-[0.2em] font-bold text-[#71717A]">
                        <th className="text-left py-3 px-4">Título</th>
                        <th className="text-left py-3 px-4">Artista</th>
                        <th className="text-left py-3 px-4">Álbum</th>
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
                          <td className="py-3 px-4 text-[#A1A1AA]">{mix.album_name || '-'}</td>
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

        {/* Create Album Dialog */}
        <Dialog open={showAlbumDialog} onOpenChange={setShowAlbumDialog}>
          <DialogContent className="bg-[#141414] border-[#27272A] text-white">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }}>
                Crear nuevo álbum
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                  Nombre del álbum *
                </label>
                <Input
                  value={albumForm.name}
                  onChange={(e) => setAlbumForm({ ...albumForm, name: e.target.value })}
                  placeholder="Cycling Power Vol. 1"
                  className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white"
                  data-testid="album-name-input"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                  Artista / DJ *
                </label>
                <Input
                  value={albumForm.artist}
                  onChange={(e) => setAlbumForm({ ...albumForm, artist: e.target.value })}
                  placeholder="DJ FitBeats"
                  className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white"
                  data-testid="album-artist-input"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                  Año *
                </label>
                <Input
                  type="number"
                  value={albumForm.year}
                  onChange={(e) => setAlbumForm({ ...albumForm, year: parseInt(e.target.value) || new Date().getFullYear() })}
                  placeholder="2024"
                  className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white"
                  data-testid="album-year-input"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                  Descripción
                </label>
                <Input
                  value={albumForm.description}
                  onChange={(e) => setAlbumForm({ ...albumForm, description: e.target.value })}
                  placeholder="Descripción opcional..."
                  className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white"
                  data-testid="album-description-input"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                  Imagen de portada
                </label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAlbumCoverFile(e.target.files[0])}
                  className="bg-[#1F1F1F] border-[#27272A] text-white file:bg-[#007AFF] file:text-white file:border-0 file:rounded file:mr-3 file:px-3 file:py-1"
                  data-testid="album-cover-input"
                />
                {albumCoverFile && (
                  <p className="text-sm text-[#34C759] mt-1">{albumCoverFile.name}</p>
                )}
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => { setShowAlbumDialog(false); setAlbumForm({ name: '', artist: '', year: new Date().getFullYear(), description: '' }); setAlbumCoverFile(null); }}
                className="bg-[#1F1F1F] border-[#27272A] text-white hover:bg-[#27272A]"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateAlbum}
                disabled={creatingAlbum}
                className="bg-[#007AFF] hover:bg-[#3395FF]"
                data-testid="confirm-create-album-btn"
              >
                {creatingAlbum ? 'Creando...' : 'Crear álbum'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                    Álbum *
                  </label>
                  <Select
                    value={uploadForm.album_id}
                    onValueChange={(value) => setUploadForm({ ...uploadForm, album_id: value })}
                  >
                    <SelectTrigger className="bg-[#1F1F1F] border-[#27272A] text-white" data-testid="mix-album-select">
                      <SelectValue placeholder="Seleccionar álbum" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F1F1F] border-[#27272A]">
                      {albums.map((album) => (
                        <SelectItem key={album.album_id} value={album.album_id} className="text-white">
                          {album.name} ({album.year})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                    Nombre del mix *
                  </label>
                  <Input
                    value={uploadForm.name}
                    onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                    placeholder="Warm Up Mix"
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
                    BPM <span className="text-[#71717A] normal-case">(auto-detectado)</span>
                  </label>
                  <Input
                    type="number"
                    value={uploadForm.bpm}
                    onChange={(e) => setUploadForm({ ...uploadForm, bpm: e.target.value })}
                    placeholder="Se detecta del audio"
                    className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white"
                    data-testid="mix-bpm-input"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                    Duración <span className="text-[#71717A] normal-case">(auto-detectada)</span>
                  </label>
                  <Input
                    type="number"
                    value={uploadForm.duration}
                    onChange={(e) => setUploadForm({ ...uploadForm, duration: e.target.value })}
                    placeholder="Se detecta del audio"
                    className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white"
                    data-testid="mix-duration-input"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                    Género <span className="text-[#71717A] normal-case">(auto-detectado si está en metadatos)</span>
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
                    Imagen de portada (opcional, usa la del álbum si no se proporciona)
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

        {/* Batch Upload Dialog */}
        <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
          <DialogContent className="bg-[#141414] border-[#27272A] text-white max-w-lg">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }}>
                Subir mixes en lote
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-2">
              <p className="text-sm text-[#A1A1AA]">
                Sube múltiples archivos de audio. El nombre del mix se tomará del nombre del archivo.
                BPM, duración y género se detectan automáticamente.
              </p>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                  Artista / DJ *
                </label>
                <Input
                  value={batchForm.artist}
                  onChange={(e) => setBatchForm({ ...batchForm, artist: e.target.value })}
                  placeholder="Nombre del artista o DJ"
                  className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white"
                  data-testid="batch-artist-input"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                  Álbum
                </label>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={batchForm.albumMode === 'existing'}
                      onChange={() => setBatchForm({ ...batchForm, albumMode: 'existing' })}
                      className="accent-[#007AFF]"
                    />
                    <span className="text-sm">Álbum existente</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={batchForm.albumMode === 'new'}
                      onChange={() => setBatchForm({ ...batchForm, albumMode: 'new' })}
                      className="accent-[#007AFF]"
                    />
                    <span className="text-sm">Crear nuevo álbum</span>
                  </label>
                </div>

                {batchForm.albumMode === 'existing' ? (
                  <Select
                    value={batchForm.album_id}
                    onValueChange={(value) => setBatchForm({ ...batchForm, album_id: value })}
                  >
                    <SelectTrigger className="bg-[#1F1F1F] border-[#27272A] text-white" data-testid="batch-album-select">
                      <SelectValue placeholder="Seleccionar álbum" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F1F1F] border-[#27272A]">
                      {albums.map((album) => (
                        <SelectItem key={album.album_id} value={album.album_id} className="text-white">
                          {album.name} ({album.year})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-3">
                    <Input
                      value={batchForm.new_album_name}
                      onChange={(e) => setBatchForm({ ...batchForm, new_album_name: e.target.value })}
                      placeholder="Nombre del nuevo álbum"
                      className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white"
                      data-testid="batch-new-album-name"
                    />
                    <Input
                      type="number"
                      value={batchForm.new_album_year}
                      onChange={(e) => setBatchForm({ ...batchForm, new_album_year: parseInt(e.target.value) || new Date().getFullYear() })}
                      placeholder="Año"
                      className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white"
                      data-testid="batch-new-album-year"
                    />
                    <div>
                      <label className="text-xs text-[#71717A] mb-1 block">Portada del álbum</label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setBatchCoverFile(e.target.files[0])}
                        className="bg-[#1F1F1F] border-[#27272A] text-white file:bg-[#007AFF] file:text-white file:border-0 file:rounded file:mr-3 file:px-3 file:py-1"
                        data-testid="batch-album-cover"
                      />
                      {batchCoverFile && (
                        <p className="text-sm text-[#34C759] mt-1">{batchCoverFile.name}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                  Archivos de audio *
                </label>
                <Input
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={(e) => setBatchAudioFiles(Array.from(e.target.files))}
                  className="bg-[#1F1F1F] border-[#27272A] text-white file:bg-[#007AFF] file:text-white file:border-0 file:rounded file:mr-3 file:px-3 file:py-1"
                  data-testid="batch-audio-input"
                />
                {batchAudioFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-[#34C759]">{batchAudioFiles.length} archivos seleccionados:</p>
                    <div className="max-h-32 overflow-y-auto">
                      {batchAudioFiles.map((file, i) => (
                        <p key={i} className="text-xs text-[#71717A] truncate">{file.name}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => { setShowBatchDialog(false); resetBatchForm(); }}
                className="bg-[#1F1F1F] border-[#27272A] text-white hover:bg-[#27272A]"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleBatchUpload}
                disabled={batchUploading}
                className="bg-[#007AFF] hover:bg-[#3395FF]"
                data-testid="confirm-batch-upload-btn"
              >
                {batchUploading ? `Subiendo ${batchAudioFiles.length} mixes...` : `Subir ${batchAudioFiles.length} mixes`}
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
                    <SelectItem value="none" className="text-white">Sin estudio</SelectItem>
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

        {/* Delete Album Confirmation */}
        <AlertDialog open={!!deleteAlbum} onOpenChange={() => setDeleteAlbum(null)}>
          <AlertDialogContent className="bg-[#141414] border-[#27272A]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">¿Eliminar álbum?</AlertDialogTitle>
              <AlertDialogDescription className="text-[#A1A1AA]">
                Esta acción desactivará el álbum "{deleteAlbum?.name}". Solo se puede eliminar si no tiene mixes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-[#1F1F1F] border-[#27272A] text-white hover:bg-[#27272A]">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAlbum} className="bg-[#FF3B30] hover:bg-[#FF6159]">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
