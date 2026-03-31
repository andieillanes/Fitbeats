"""
Iteration 13 - Backend API Tests for Playback Features
Tests: health, auth, mixes with duration, spotify endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndAuth:
    """Health check and authentication tests"""
    
    def test_health_check(self):
        """GET /api/health returns 200 with healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health check passed")
    
    def test_login_success(self):
        """POST /api/auth/login with admin credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@fitbeats.com", "password": "Admin123!"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("email") == "admin@fitbeats.com"
        assert data.get("role") == "admin"
        print("✓ Admin login successful")
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login with wrong password returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@fitbeats.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401
        print("✓ Invalid credentials rejected")


class TestMixesWithDuration:
    """Tests for mixes endpoint - verifying duration field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookies"""
        self.session = requests.Session()
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@fitbeats.com", "password": "Admin123!"}
        )
        assert response.status_code == 200
    
    def test_get_mixes_returns_duration(self):
        """GET /api/mixes returns mixes with duration field (number in seconds)"""
        response = self.session.get(f"{BASE_URL}/api/mixes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Expected at least one mix"
        
        # Check first mix has duration field
        first_mix = data[0]
        assert "duration" in first_mix, "Mix should have duration field"
        assert isinstance(first_mix["duration"], (int, float, type(None))), "Duration should be a number or None"
        
        # Check TABATA mixes have duration 245 (4:05)
        tabata_mixes = [m for m in data if "TABATA" in m.get("name", "")]
        if tabata_mixes:
            for mix in tabata_mixes[:3]:
                assert mix.get("duration") == 245, f"TABATA mix should have duration 245, got {mix.get('duration')}"
        
        print(f"✓ GET /api/mixes returned {len(data)} mixes with duration field")
    
    def test_mix_has_required_fields(self):
        """Verify mix response has all required fields"""
        response = self.session.get(f"{BASE_URL}/api/mixes")
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["mix_id", "name", "artist", "duration", "album_id"]
        for mix in data[:5]:
            for field in required_fields:
                assert field in mix, f"Mix missing required field: {field}"
        
        print("✓ Mixes have all required fields")


class TestSpotifyEndpoints:
    """Tests for Spotify integration endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookies"""
        self.session = requests.Session()
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@fitbeats.com", "password": "Admin123!"}
        )
        assert response.status_code == 200
    
    def test_spotify_token_returns_connected_status(self):
        """GET /api/spotify/token returns connected status field"""
        response = self.session.get(f"{BASE_URL}/api/spotify/token")
        assert response.status_code == 200
        data = response.json()
        assert "connected" in data, "Response should have 'connected' field"
        assert isinstance(data["connected"], bool), "connected should be boolean"
        print(f"✓ Spotify token endpoint returned connected={data['connected']}")
    
    def test_spotify_transfer_validates_device_id(self):
        """PUT /api/spotify/transfer returns 400 for missing device_id"""
        response = self.session.put(
            f"{BASE_URL}/api/spotify/transfer",
            json={}
        )
        assert response.status_code == 400
        data = response.json()
        assert "device_id" in data.get("detail", "").lower()
        print("✓ Spotify transfer validates device_id parameter")
    
    def test_spotify_transfer_with_device_id_not_connected(self):
        """PUT /api/spotify/transfer returns 401 when Spotify not connected"""
        response = self.session.put(
            f"{BASE_URL}/api/spotify/transfer",
            json={"device_id": "test_device_123"}
        )
        # Should return 401 since test account doesn't have Spotify connected
        assert response.status_code == 401
        print("✓ Spotify transfer returns 401 when not connected")
    
    def test_spotify_auth_url(self):
        """GET /api/spotify/auth-url returns auth_url and redirect_uri"""
        response = self.session.get(f"{BASE_URL}/api/spotify/auth-url")
        assert response.status_code == 200
        data = response.json()
        assert "auth_url" in data
        assert "redirect_uri" in data
        assert "accounts.spotify.com" in data["auth_url"]
        print("✓ Spotify auth URL endpoint working")
    
    def test_spotify_search(self):
        """GET /api/spotify/search returns tracks"""
        response = self.session.get(f"{BASE_URL}/api/spotify/search?q=workout")
        assert response.status_code == 200
        data = response.json()
        assert "tracks" in data
        assert isinstance(data["tracks"], list)
        if data["tracks"]:
            track = data["tracks"][0]
            assert "spotify_id" in track
            assert "name" in track
            assert "artist" in track
        print(f"✓ Spotify search returned {len(data.get('tracks', []))} tracks")


class TestPlaylistsAndClassMode:
    """Tests for playlists and class mode endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookies"""
        self.session = requests.Session()
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@fitbeats.com", "password": "Admin123!"}
        )
        assert response.status_code == 200
    
    def test_get_playlists(self):
        """GET /api/playlists/mine returns user playlists"""
        response = self.session.get(f"{BASE_URL}/api/playlists/mine")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/playlists/mine returned {len(data)} playlists")
    
    def test_get_class_sessions(self):
        """GET /api/class-sessions returns class sessions"""
        response = self.session.get(f"{BASE_URL}/api/class-sessions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/class-sessions returned {len(data)} sessions")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
