"""
Test suite for FitBeats Public Playlists and Download features
Tests: Public playlist endpoints (no auth), playlist download, share functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@fitbeats.com"
ADMIN_PASSWORD = "Admin123!"

# Test playlist ID (public with Spotify tracks)
TEST_PUBLIC_PLAYLIST_ID = "playlist_9ce625ab7be1"


class TestPublicPlaylistEndpoints:
    """Test public playlist endpoints - NO AUTH REQUIRED"""
    
    def test_get_public_playlist_without_auth(self):
        """GET /api/public/playlists/{id} returns public playlist without auth"""
        response = requests.get(f"{BASE_URL}/api/public/playlists/{TEST_PUBLIC_PLAYLIST_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "playlist_id" in data
        assert data["playlist_id"] == TEST_PUBLIC_PLAYLIST_ID
        assert "name" in data
        assert "user_name" in data
        assert data.get("is_public") == True
        print(f"✓ Public playlist retrieved: {data['name']}")
    
    def test_get_public_playlist_items_without_auth(self):
        """GET /api/public/playlists/{id}/items returns items without auth"""
        response = requests.get(f"{BASE_URL}/api/public/playlists/{TEST_PUBLIC_PLAYLIST_ID}/items")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "items" in data
        items = data["items"]
        assert isinstance(items, list)
        print(f"✓ Public playlist items retrieved: {len(items)} items")
        
        # Verify item structure
        for item in items:
            assert "type" in item
            assert "name" in item
            assert "artist" in item
            if item["type"] == "spotify":
                assert "spotify_id" in item
                assert "album" in item
            elif item["type"] == "mix":
                assert "mix_id" in item
    
    def test_get_nonexistent_public_playlist_returns_404(self):
        """GET /api/public/playlists/nonexistent returns 404"""
        response = requests.get(f"{BASE_URL}/api/public/playlists/nonexistent_playlist_id")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Nonexistent playlist returns 404")
    
    def test_get_nonexistent_public_playlist_items_returns_404(self):
        """GET /api/public/playlists/nonexistent/items returns 404"""
        response = requests.get(f"{BASE_URL}/api/public/playlists/nonexistent_playlist_id/items")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Nonexistent playlist items returns 404")


class TestPlaylistDownload:
    """Test playlist download endpoint"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return session
    
    def test_download_spotify_only_playlist_returns_400(self, auth_session):
        """GET /api/playlists/{id}/download returns 400 when no local mixes"""
        response = auth_session.get(f"{BASE_URL}/api/playlists/{TEST_PUBLIC_PLAYLIST_ID}/download")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data
        assert "No hay mixes locales" in data["detail"]
        print("✓ Download returns 400 for Spotify-only playlist")
    
    def test_download_requires_auth(self):
        """GET /api/playlists/{id}/download requires authentication"""
        response = requests.get(f"{BASE_URL}/api/playlists/{TEST_PUBLIC_PLAYLIST_ID}/download")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Download endpoint requires authentication")


class TestSpotifySearchRegression:
    """Regression tests for Spotify search"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return session
    
    def test_spotify_search_still_works(self, auth_session):
        """GET /api/spotify/search?q=workout returns tracks"""
        response = auth_session.get(f"{BASE_URL}/api/spotify/search", params={"q": "workout"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tracks" in data
        tracks = data["tracks"]
        assert len(tracks) > 0, "Expected at least one track"
        
        # Verify track structure
        track = tracks[0]
        assert "spotify_id" in track
        assert "name" in track
        assert "artist" in track
        assert "album" in track
        assert "type" in track
        assert track["type"] == "spotify"
        print(f"✓ Spotify search works: {len(tracks)} tracks found")


class TestPlaylistItemsRegression:
    """Regression tests for adding items to playlists"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return session
    
    def test_create_playlist_and_add_spotify_item(self, auth_session):
        """Create playlist and add Spotify track"""
        # Create playlist
        create_response = auth_session.post(f"{BASE_URL}/api/playlists", json={
            "name": "TEST_Public_Playlist_Download",
            "description": "Test playlist for download feature",
            "is_public": True
        })
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        playlist_id = create_response.json()["playlist_id"]
        
        try:
            # Add Spotify item
            add_response = auth_session.post(f"{BASE_URL}/api/playlists/{playlist_id}/items", json={
                "type": "spotify",
                "spotify_id": "test_spotify_track_123",
                "name": "Test Track",
                "artist": "Test Artist",
                "album": "Test Album",
                "duration_ms": 180000,
                "uri": "spotify:track:test_spotify_track_123"
            })
            assert add_response.status_code == 200, f"Add item failed: {add_response.text}"
            
            # Verify item was added
            items_response = auth_session.get(f"{BASE_URL}/api/playlists/{playlist_id}/items")
            assert items_response.status_code == 200
            items = items_response.json()["items"]
            assert len(items) == 1
            assert items[0]["type"] == "spotify"
            assert items[0]["name"] == "Test Track"
            print("✓ Playlist creation and Spotify item addition works")
            
        finally:
            # Cleanup
            auth_session.delete(f"{BASE_URL}/api/playlists/{playlist_id}")


class TestAuthenticatedPlaylistAccess:
    """Test authenticated playlist endpoints still work"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return session
    
    def test_get_playlist_with_auth(self, auth_session):
        """GET /api/playlists/{id} works with auth"""
        response = auth_session.get(f"{BASE_URL}/api/playlists/{TEST_PUBLIC_PLAYLIST_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["playlist_id"] == TEST_PUBLIC_PLAYLIST_ID
        print("✓ Authenticated playlist access works")
    
    def test_get_playlist_items_with_auth(self, auth_session):
        """GET /api/playlists/{id}/items works with auth"""
        response = auth_session.get(f"{BASE_URL}/api/playlists/{TEST_PUBLIC_PLAYLIST_ID}/items")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "items" in data
        print("✓ Authenticated playlist items access works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
