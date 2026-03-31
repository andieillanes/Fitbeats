"""
Iteration 18 - Testing Playlist Bug Fixes:
1. Playlists view shows correct song count (items.length + mix_ids.length)
2. Playlist card shows cover art from first Spotify track
3. Backend returns items with type, name, artist, uri fields
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndAuth:
    """Health check and authentication tests"""
    
    def test_health_endpoint(self):
        """GET /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health endpoint returns 200")
    
    def test_login_success(self):
        """POST /api/auth/login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fitbeats.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert data["email"] == "admin@fitbeats.com"
        assert data["role"] == "admin"
        print("✓ Login successful with admin credentials")
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("✓ Login returns 401 for invalid credentials")


class TestPlaylistEndpoints:
    """Playlist API tests - verifying bug fixes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookie"""
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fitbeats.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, "Login failed"
    
    def test_playlists_mine_returns_items_field(self):
        """GET /api/playlists/mine returns playlists with items field populated"""
        response = self.session.get(f"{BASE_URL}/api/playlists/mine")
        assert response.status_code == 200
        playlists = response.json()
        assert isinstance(playlists, list)
        
        # Find the test playlist
        cardio_playlist = next((p for p in playlists if p["playlist_id"] == "playlist_9ce625ab7be1"), None)
        assert cardio_playlist is not None, "Test playlist 'Cardio Vibes 2026' not found"
        
        # Verify items field exists and has data
        assert "items" in cardio_playlist
        assert isinstance(cardio_playlist["items"], list)
        assert len(cardio_playlist["items"]) == 2, f"Expected 2 items, got {len(cardio_playlist['items'])}"
        
        # Verify mix_ids field exists (should be empty for Spotify imports)
        assert "mix_ids" in cardio_playlist
        assert isinstance(cardio_playlist["mix_ids"], list)
        
        print(f"✓ Playlist has {len(cardio_playlist['items'])} items and {len(cardio_playlist['mix_ids'])} mix_ids")
    
    def test_playlist_detail_returns_full_data(self):
        """GET /api/playlists/{id} returns full playlist with items"""
        response = self.session.get(f"{BASE_URL}/api/playlists/playlist_9ce625ab7be1")
        assert response.status_code == 200
        playlist = response.json()
        
        # Verify required fields
        assert playlist["playlist_id"] == "playlist_9ce625ab7be1"
        assert playlist["name"] == "Cardio Vibes 2026"
        assert "items" in playlist
        assert "mix_ids" in playlist
        assert "user_name" in playlist
        
        # Verify items have required fields
        items = playlist["items"]
        assert len(items) == 2
        
        for item in items:
            assert "type" in item, "Item missing 'type' field"
            assert "name" in item, "Item missing 'name' field"
            assert "artist" in item, "Item missing 'artist' field"
            assert item["type"] == "spotify", f"Expected type 'spotify', got '{item['type']}'"
        
        print("✓ Playlist detail returns all required fields")
    
    def test_playlist_items_endpoint(self):
        """GET /api/playlists/{id}/items returns enriched items"""
        response = self.session.get(f"{BASE_URL}/api/playlists/playlist_9ce625ab7be1/items")
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        items = data["items"]
        assert len(items) == 2
        
        # Verify first track (Cardio by Timmy Trumpet)
        first_item = items[0]
        assert first_item["type"] == "spotify"
        assert first_item["name"] == "Cardio"
        assert first_item["artist"] == "Timmy Trumpet"
        assert "uri" in first_item
        assert first_item["uri"].startswith("spotify:track:")
        assert "album_image" in first_item
        assert first_item["album_image"].startswith("https://")
        
        # Verify second track (Tsunami)
        second_item = items[1]
        assert second_item["type"] == "spotify"
        assert "Tsunami" in second_item["name"]
        assert "CrossFit Junkies" in second_item["artist"]
        
        print("✓ Playlist items endpoint returns enriched items with type, name, artist, uri fields")
    
    def test_playlist_items_have_album_image(self):
        """Verify items have album_image for cover art display"""
        response = self.session.get(f"{BASE_URL}/api/playlists/playlist_9ce625ab7be1/items")
        assert response.status_code == 200
        items = response.json()["items"]
        
        # At least one item should have album_image for cover display
        items_with_image = [i for i in items if i.get("album_image")]
        assert len(items_with_image) > 0, "No items have album_image for cover display"
        
        # Verify the first item's album_image is a valid URL
        first_image = items_with_image[0]["album_image"]
        assert first_image.startswith("https://"), f"Invalid album_image URL: {first_image}"
        
        print(f"✓ {len(items_with_image)} items have album_image for cover art")


class TestOtherEndpoints:
    """Test other endpoints still work"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookie"""
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fitbeats.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, "Login failed"
    
    def test_albums_endpoint(self):
        """GET /api/albums returns albums list"""
        response = self.session.get(f"{BASE_URL}/api/albums")
        assert response.status_code == 200
        albums = response.json()
        assert isinstance(albums, list)
        print(f"✓ Albums endpoint returns {len(albums)} albums")
    
    def test_mixes_endpoint(self):
        """GET /api/mixes returns mixes list"""
        response = self.session.get(f"{BASE_URL}/api/mixes")
        assert response.status_code == 200
        mixes = response.json()
        assert isinstance(mixes, list)
        print(f"✓ Mixes endpoint returns {len(mixes)} mixes")
    
    def test_class_sessions_endpoint(self):
        """GET /api/class-sessions returns sessions list"""
        response = self.session.get(f"{BASE_URL}/api/class-sessions")
        assert response.status_code == 200
        sessions = response.json()
        assert isinstance(sessions, list)
        print(f"✓ Class sessions endpoint returns {len(sessions)} sessions")
    
    def test_spotify_search(self):
        """GET /api/spotify/search works with client credentials"""
        response = self.session.get(f"{BASE_URL}/api/spotify/search?q=cardio&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert "tracks" in data
        assert isinstance(data["tracks"], list)
        print(f"✓ Spotify search returns {len(data['tracks'])} tracks")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
