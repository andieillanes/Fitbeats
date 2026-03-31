"""
Iteration 14 Tests - FitBeats Platform
Tests for:
1. Health check
2. Login with admin credentials
3. Class sessions CRUD (including rename via PUT)
4. Mixes endpoint
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
    
    def test_login_admin(self):
        """POST /api/auth/login works with admin credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@fitbeats.com", "password": "Admin123!"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("email") == "admin@fitbeats.com"
        assert data.get("role") == "admin"
        print(f"✓ Admin login successful: {data.get('name')}")
        return response.cookies


class TestClassSessions:
    """Class sessions CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookies"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@fitbeats.com", "password": "Admin123!"}
        )
        self.cookies = response.cookies
        self.session = requests.Session()
        self.session.cookies.update(self.cookies)
    
    def test_get_class_sessions(self):
        """GET /api/class-sessions returns list of sessions"""
        response = self.session.get(f"{BASE_URL}/api/class-sessions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} class sessions")
        
        # Check if HIIT Session exists
        hiit_session = next((s for s in data if "HIIT" in s.get("name", "")), None)
        if hiit_session:
            print(f"  - Found HIIT session: {hiit_session['name']} with {len(hiit_session.get('tracks', []))} tracks")
            return hiit_session
        return data[0] if data else None
    
    def test_rename_class_session_via_put(self):
        """PUT /api/class-sessions/{id} can update just the name field"""
        # First get existing sessions
        response = self.session.get(f"{BASE_URL}/api/class-sessions")
        assert response.status_code == 200
        sessions = response.json()
        
        if not sessions:
            pytest.skip("No class sessions to test rename")
        
        session = sessions[0]
        session_id = session["session_id"]
        original_name = session["name"]
        
        # Rename the session
        new_name = f"TEST_Renamed_{original_name}"
        response = self.session.put(
            f"{BASE_URL}/api/class-sessions/{session_id}",
            json={"name": new_name}
        )
        assert response.status_code == 200
        print(f"✓ Renamed session from '{original_name}' to '{new_name}'")
        
        # Verify the rename persisted
        response = self.session.get(f"{BASE_URL}/api/class-sessions")
        assert response.status_code == 200
        updated_sessions = response.json()
        updated_session = next((s for s in updated_sessions if s["session_id"] == session_id), None)
        assert updated_session is not None
        assert updated_session["name"] == new_name
        print(f"✓ Verified rename persisted: {updated_session['name']}")
        
        # Restore original name
        response = self.session.put(
            f"{BASE_URL}/api/class-sessions/{session_id}",
            json={"name": original_name}
        )
        assert response.status_code == 200
        print(f"✓ Restored original name: {original_name}")
    
    def test_create_and_delete_class_session(self):
        """POST /api/class-sessions creates new session, DELETE removes it"""
        # Create a new session
        new_session = {
            "name": "TEST_New Class Session",
            "tracks": [
                {
                    "type": "mix",
                    "mix_id": "mix_0532c8aaf052",
                    "name": "Test Track",
                    "artist": "Test Artist",
                    "original_duration": 180,
                    "transition": "crossfade"
                }
            ],
            "total_duration": 3,
            "transition_duration": 3
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/class-sessions",
            json=new_session
        )
        assert response.status_code in [200, 201]
        created = response.json()
        session_id = created.get("session_id")
        assert session_id is not None
        print(f"✓ Created new class session: {session_id}")
        
        # Verify it exists
        response = self.session.get(f"{BASE_URL}/api/class-sessions")
        sessions = response.json()
        found = any(s["session_id"] == session_id for s in sessions)
        assert found, "Created session not found in list"
        print("✓ Verified session exists in list")
        
        # Delete the session
        response = self.session.delete(f"{BASE_URL}/api/class-sessions/{session_id}")
        assert response.status_code in [200, 204]
        print(f"✓ Deleted session: {session_id}")
        
        # Verify deletion
        response = self.session.get(f"{BASE_URL}/api/class-sessions")
        sessions = response.json()
        found = any(s["session_id"] == session_id for s in sessions)
        assert not found, "Deleted session still exists"
        print("✓ Verified session was deleted")


class TestMixes:
    """Mixes endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookies"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@fitbeats.com", "password": "Admin123!"}
        )
        self.cookies = response.cookies
        self.session = requests.Session()
        self.session.cookies.update(self.cookies)
    
    def test_get_mixes(self):
        """GET /api/mixes returns list of mixes with duration"""
        response = self.session.get(f"{BASE_URL}/api/mixes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} mixes")
        
        if data:
            mix = data[0]
            assert "mix_id" in mix
            assert "name" in mix
            print(f"  - First mix: {mix.get('name')} by {mix.get('artist')}")
            if mix.get("duration"):
                print(f"  - Duration: {mix.get('duration')} seconds")


class TestSpotifyEndpoints:
    """Spotify integration endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookies"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@fitbeats.com", "password": "Admin123!"}
        )
        self.cookies = response.cookies
        self.session = requests.Session()
        self.session.cookies.update(self.cookies)
    
    def test_spotify_token_endpoint(self):
        """GET /api/spotify/token returns connected status"""
        response = self.session.get(f"{BASE_URL}/api/spotify/token")
        assert response.status_code == 200
        data = response.json()
        assert "connected" in data
        print(f"✓ Spotify token endpoint works, connected: {data.get('connected')}")
    
    def test_spotify_auth_url(self):
        """GET /api/spotify/auth-url returns auth_url"""
        response = self.session.get(f"{BASE_URL}/api/spotify/auth-url")
        assert response.status_code == 200
        data = response.json()
        assert "auth_url" in data
        print(f"✓ Spotify auth URL endpoint works")
    
    def test_spotify_search(self):
        """GET /api/spotify/search returns tracks"""
        response = self.session.get(f"{BASE_URL}/api/spotify/search?q=workout&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert "tracks" in data
        print(f"✓ Spotify search works, got {len(data.get('tracks', []))} tracks")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
