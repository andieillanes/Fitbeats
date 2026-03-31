"""
Iteration 16 - Backend Tests for:
1. Health check
2. Auth login
3. Spotify playlists endpoint (returns 401 when not connected - correct behavior)
4. Spotify playlist import endpoint (returns 401 when not connected)
5. Class sessions CRUD
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@fitbeats.com"
ADMIN_PASSWORD = "Admin123!"


class TestHealthAndAuth:
    """Health check and authentication tests"""
    
    def test_health_check(self):
        """GET /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("✓ Health check passed")
    
    def test_login_success(self):
        """POST /api/auth/login works with admin credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "user_id" in data, "Response missing user_id"
        assert data["email"] == ADMIN_EMAIL.lower(), "Email mismatch"
        print(f"✓ Login successful for {data['email']}")
        return response.cookies.get("access_token")
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login returns 401 for invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wrong@example.com", "password": "wrongpass"},
            timeout=10
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")


class TestSpotifyEndpoints:
    """Spotify playlist endpoints - admin user does NOT have Spotify connected"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        assert response.status_code == 200, "Login failed in setup"
    
    def test_spotify_playlists_returns_401_when_not_connected(self):
        """GET /api/spotify/playlists returns 401 when Spotify not connected (correct behavior)"""
        response = self.session.get(f"{BASE_URL}/api/spotify/playlists", timeout=10)
        # Admin user does NOT have Spotify connected, so 401 is expected
        assert response.status_code == 401, f"Expected 401 (Spotify not connected), got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Response should have detail message"
        print(f"✓ Spotify playlists correctly returns 401: {data.get('detail')}")
    
    def test_spotify_import_returns_401_when_not_connected(self):
        """POST /api/spotify/playlists/{id}/import returns 401 when Spotify not connected"""
        response = self.session.post(
            f"{BASE_URL}/api/spotify/playlists/test_playlist_id/import",
            timeout=10
        )
        # Admin user does NOT have Spotify connected, so 401 is expected
        assert response.status_code == 401, f"Expected 401 (Spotify not connected), got {response.status_code}"
        print("✓ Spotify import correctly returns 401 when not connected")
    
    def test_spotify_search_works(self):
        """GET /api/spotify/search works (uses client credentials, not user token)"""
        response = self.session.get(
            f"{BASE_URL}/api/spotify/search",
            params={"q": "workout", "limit": 5},
            timeout=15
        )
        assert response.status_code == 200, f"Spotify search failed: {response.status_code}"
        data = response.json()
        assert "tracks" in data, "Response missing tracks"
        print(f"✓ Spotify search returned {len(data.get('tracks', []))} tracks")


class TestClassSessions:
    """Class sessions CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        assert response.status_code == 200, "Login failed in setup"
        self.created_session_id = None
    
    def test_get_class_sessions(self):
        """GET /api/class-sessions returns sessions list"""
        response = self.session.get(f"{BASE_URL}/api/class-sessions", timeout=10)
        assert response.status_code == 200, f"Failed to get sessions: {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Got {len(data)} class sessions")
        return data
    
    def test_create_class_session(self):
        """POST /api/class-sessions creates a new session"""
        payload = {
            "name": "TEST_Iteration16_Session",
            "tracks": [
                {
                    "type": "mix",
                    "mix_id": "test_mix_1",
                    "name": "Test Track 1",
                    "artist": "Test Artist",
                    "original_duration": 240,
                    "transition": "crossfade"
                }
            ],
            "total_duration": 4,
            "transition_duration": 3
        }
        response = self.session.post(
            f"{BASE_URL}/api/class-sessions",
            json=payload,
            timeout=10
        )
        assert response.status_code == 200, f"Failed to create session: {response.status_code} - {response.text}"
        data = response.json()
        assert "session_id" in data, "Response missing session_id"
        assert data["name"] == payload["name"], "Name mismatch"
        assert len(data["tracks"]) == 1, "Tracks count mismatch"
        self.created_session_id = data["session_id"]
        print(f"✓ Created class session: {data['session_id']}")
        return data["session_id"]
    
    def test_update_class_session(self):
        """PUT /api/class-sessions/{id} updates a session"""
        # First create a session
        create_payload = {
            "name": "TEST_Update_Session",
            "tracks": [
                {
                    "type": "mix",
                    "mix_id": "test_mix_1",
                    "name": "Test Track",
                    "artist": "Test Artist",
                    "original_duration": 240,
                    "transition": "cut"
                }
            ],
            "transition_duration": 3
        }
        create_response = self.session.post(
            f"{BASE_URL}/api/class-sessions",
            json=create_payload,
            timeout=10
        )
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]
        
        # Update the session
        update_payload = {
            "name": "TEST_Updated_Session_Name",
            "transition_duration": 5
        }
        update_response = self.session.put(
            f"{BASE_URL}/api/class-sessions/{session_id}",
            json=update_payload,
            timeout=10
        )
        assert update_response.status_code == 200, f"Failed to update: {update_response.status_code}"
        print(f"✓ Updated class session: {session_id}")
        
        # Verify update
        get_response = self.session.get(f"{BASE_URL}/api/class-sessions/{session_id}", timeout=10)
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["name"] == update_payload["name"], "Name not updated"
        assert data["transition_duration"] == update_payload["transition_duration"], "Transition duration not updated"
        print("✓ Verified session update persisted")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/class-sessions/{session_id}", timeout=10)
    
    def test_delete_class_session(self):
        """DELETE /api/class-sessions/{id} deletes a session"""
        # First create a session
        create_payload = {
            "name": "TEST_Delete_Session",
            "tracks": [],
            "transition_duration": 3
        }
        create_response = self.session.post(
            f"{BASE_URL}/api/class-sessions",
            json=create_payload,
            timeout=10
        )
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]
        
        # Delete the session
        delete_response = self.session.delete(
            f"{BASE_URL}/api/class-sessions/{session_id}",
            timeout=10
        )
        assert delete_response.status_code == 200, f"Failed to delete: {delete_response.status_code}"
        print(f"✓ Deleted class session: {session_id}")
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/class-sessions/{session_id}", timeout=10)
        assert get_response.status_code == 404, "Session should not exist after deletion"
        print("✓ Verified session deletion")


class TestMixesAndAlbums:
    """Basic mixes and albums tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        assert response.status_code == 200, "Login failed in setup"
    
    def test_get_mixes(self):
        """GET /api/mixes returns mixes list"""
        response = self.session.get(f"{BASE_URL}/api/mixes", timeout=10)
        assert response.status_code == 200, f"Failed to get mixes: {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Got {len(data)} mixes")
    
    def test_get_albums(self):
        """GET /api/albums returns albums list"""
        response = self.session.get(f"{BASE_URL}/api/albums", timeout=10)
        assert response.status_code == 200, f"Failed to get albums: {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Got {len(data)} albums")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        assert response.status_code == 200, "Login failed in setup"
    
    def test_cleanup_test_sessions(self):
        """Clean up TEST_ prefixed class sessions"""
        response = self.session.get(f"{BASE_URL}/api/class-sessions", timeout=10)
        if response.status_code == 200:
            sessions = response.json()
            deleted = 0
            for session in sessions:
                if session.get("name", "").startswith("TEST_"):
                    del_resp = self.session.delete(
                        f"{BASE_URL}/api/class-sessions/{session['session_id']}",
                        timeout=10
                    )
                    if del_resp.status_code == 200:
                        deleted += 1
            print(f"✓ Cleaned up {deleted} test sessions")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
