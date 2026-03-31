"""
FitBeats API Tests - Spotify Transfer Playback & Token Endpoints
Tests for the new PUT /api/spotify/transfer endpoint and related Spotify features
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@fitbeats.com"
ADMIN_PASSWORD = "Admin123!"


@pytest.fixture(scope="module")
def session():
    """Create a session that maintains cookies"""
    s = requests.Session()
    response = s.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Login failed: {response.text}")
    print(f"✓ Logged in as {ADMIN_EMAIL}")
    return s


class TestHealthAndAuth:
    """Basic health and auth tests"""
    
    def test_health_endpoint(self):
        """Test GET /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        data = response.json()
        assert data.get("status") == "healthy" or "status" in data
        print("✓ Health endpoint working")
    
    def test_login_success(self):
        """Test POST /api/auth/login with admin credentials"""
        s = requests.Session()
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        assert "access_token" in s.cookies
        print(f"✓ Login successful for {ADMIN_EMAIL}")


class TestSpotifyToken:
    """Spotify token endpoint tests"""
    
    def test_spotify_token_endpoint(self, session):
        """Test GET /api/spotify/token returns connected status"""
        response = session.get(f"{BASE_URL}/api/spotify/token")
        assert response.status_code == 200, f"Spotify token failed: {response.text}"
        data = response.json()
        # Should have 'connected' field
        assert "connected" in data, "Response should have 'connected' field"
        print(f"✓ Spotify token endpoint working, connected: {data.get('connected')}")
        if data.get("connected"):
            # If connected, should have access_token
            assert "access_token" in data, "Connected user should have access_token"
            print("  Access token present")
    
    def test_spotify_token_requires_auth(self):
        """Test that /api/spotify/token requires authentication"""
        response = requests.get(f"{BASE_URL}/api/spotify/token")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Spotify token correctly requires authentication")


class TestSpotifyTransfer:
    """Tests for the new PUT /api/spotify/transfer endpoint"""
    
    def test_transfer_endpoint_exists(self, session):
        """Test PUT /api/spotify/transfer endpoint exists"""
        # Send request without device_id to test validation
        response = session.put(f"{BASE_URL}/api/spotify/transfer", json={})
        # Should return 400 (missing device_id) or 401 (Spotify not connected)
        # NOT 404 (endpoint not found) or 405 (method not allowed)
        assert response.status_code in [400, 401], f"Unexpected status: {response.status_code} - {response.text}"
        print(f"✓ Transfer endpoint exists, returned {response.status_code}")
    
    def test_transfer_validates_device_id(self, session):
        """Test PUT /api/spotify/transfer validates device_id parameter"""
        response = session.put(f"{BASE_URL}/api/spotify/transfer", json={})
        assert response.status_code == 400, f"Expected 400 for missing device_id, got {response.status_code}"
        data = response.json()
        assert "device_id" in data.get("detail", "").lower(), f"Error should mention device_id: {data}"
        print("✓ Transfer endpoint validates device_id parameter")
    
    def test_transfer_with_device_id(self, session):
        """Test PUT /api/spotify/transfer with device_id (may fail if Spotify not connected)"""
        response = session.put(f"{BASE_URL}/api/spotify/transfer", json={
            "device_id": "test_device_12345"
        })
        # If Spotify not connected, should return 401
        # If connected but device invalid, Spotify API will return error
        # Either way, endpoint should handle it gracefully
        assert response.status_code in [200, 401, 403, 404, 502], f"Unexpected status: {response.status_code}"
        print(f"✓ Transfer with device_id returned {response.status_code}")
        if response.status_code == 401:
            print("  (Spotify not connected - expected for test account)")
    
    def test_transfer_requires_auth(self):
        """Test that /api/spotify/transfer requires authentication"""
        response = requests.put(f"{BASE_URL}/api/spotify/transfer", json={
            "device_id": "test_device"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Transfer endpoint correctly requires authentication")


class TestSpotifyAuthUrl:
    """Spotify OAuth URL endpoint tests"""
    
    def test_spotify_auth_url_endpoint(self, session):
        """Test GET /api/spotify/auth-url returns auth_url and redirect_uri"""
        response = session.get(f"{BASE_URL}/api/spotify/auth-url")
        assert response.status_code == 200, f"Auth URL failed: {response.text}"
        data = response.json()
        assert "auth_url" in data, "Response should have 'auth_url'"
        assert "redirect_uri" in data, "Response should have 'redirect_uri'"
        assert "accounts.spotify.com" in data["auth_url"], "auth_url should point to Spotify"
        print(f"✓ Spotify auth URL endpoint working")
        print(f"  Redirect URI: {data['redirect_uri']}")


class TestSpotifySearch:
    """Spotify search endpoint tests"""
    
    def test_spotify_search(self, session):
        """Test GET /api/spotify/search?q=test returns Spotify tracks"""
        response = session.get(f"{BASE_URL}/api/spotify/search", params={"q": "test"})
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        assert "tracks" in data, "Response should have 'tracks'"
        assert len(data["tracks"]) > 0, "Should return at least one track"
        
        # Verify track structure
        track = data["tracks"][0]
        assert "spotify_id" in track
        assert "name" in track
        assert "artist" in track
        assert "uri" in track
        print(f"✓ Spotify search returned {len(data['tracks'])} tracks")
        print(f"  First track: {track['name']} by {track['artist']}")


class TestPlaylists:
    """Playlist endpoint tests"""
    
    def test_get_my_playlists(self, session):
        """Test GET /api/playlists/mine returns array of playlists"""
        response = session.get(f"{BASE_URL}/api/playlists/mine")
        assert response.status_code == 200, f"Get playlists failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be an array"
        print(f"✓ Retrieved {len(data)} playlists")
        if data:
            print(f"  First playlist: {data[0].get('name')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
