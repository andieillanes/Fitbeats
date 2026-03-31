import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlayer, API } from '../../App';
import axios from 'axios';
import { Disc, Play, Calendar } from '@phosphor-icons/react';

export default function AlbumsView({ title = "Álbumes" }) {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const { playMix } = usePlayer();

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const res = await axios.get(`${API}/albums`);
        setAlbums(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlbums();
  }, []);

  const playAlbum = async (album, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await axios.get(`${API}/albums/${album.album_id}`);
      if (res.data.mixes && res.data.mixes.length > 0) {
        playMix(res.data.mixes[0], res.data.mixes);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1DB954]"></div>
      </div>
    );
  }

  return (
    <div data-testid="albums-view">
      <h1 className="text-3xl font-bold text-white mb-6" style={{ fontFamily: 'Outfit' }}>
        {title}
      </h1>

      {albums.length === 0 ? (
        <div className="text-center py-16">
          <Disc size={64} className="mx-auto text-[#535353] mb-4" />
          <p className="text-[#B3B3B3]">No hay álbumes disponibles</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {albums.map((album) => (
            <Link
              key={album.album_id}
              to={`/albums/${album.album_id}`}
              className="album-card group"
              data-testid={`album-card-${album.album_id}`}
            >
              <div className="album-cover-container">
                {album.cover_path ? (
                  <img
                    src={`${API}/albums/${album.album_id}/cover`}
                    alt={album.name}
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#535353] to-[#282828]">
                    <Disc size={64} className="text-[#B3B3B3]" />
                  </div>
                )}
              </div>
              
              <button 
                onClick={(e) => playAlbum(album, e)}
                className="play-button"
                data-testid={`play-album-${album.album_id}`}
              >
                <Play size={24} weight="fill" className="text-black ml-1" />
              </button>

              <h3 className="font-bold text-white truncate mb-1">{album.name}</h3>
              <p className="text-sm text-[#B3B3B3] truncate">{album.artist}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-[#6A6A6A]">
                <Calendar size={12} />
                <span>{album.year}</span>
                <span>•</span>
                <span>{album.mix_count} tracks</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
