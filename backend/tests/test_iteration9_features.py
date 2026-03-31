"""
Test iteration 9 features:
- Profile endpoints (GET/PUT /api/auth/profile)
- Class session CRUD endpoints
- Instructor access to songs (regression)
- Spotify search regression
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@fitbeats.com"
ADMIN_PASSWORD = "Admin123!"
INSTRUCTOR_EMAIL = "instructor@test.com"
INSTRUCTOR_PASSWORD = "Test1234!"


class TestAuthProfile:
    """Profile endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get session"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        self.user = login_resp.json()
    
    def test_get_profile_returns_user_info(self):
        """GET /api/auth/profile returns user profile"""
        resp = self.session.get(f"{BASE_URL}/api/auth/profile")
        assert resp.status_code == 200, f"GET profile failed: {resp.text}"
        data = resp.json()
        assert "user_id" in data
        assert "email" in data
        assert "name" in data
        assert "role" in data
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        # Should not contain password_hash
        assert "password_hash" not in data
        print(f"Profile data: {data}")
    
    def test_update_profile_name(self):
        """PUT /api/auth/profile with {name:'New Name'} updates name"""
        new_name = "TEST_Admin_Updated"
        resp = self.session.put(f"{BASE_URL}/api/auth/profile", json={"name": new_name})
        assert resp.status_code == 200, f"PUT profile failed: {resp.text}"
        data = resp.json()
        assert data.get("name") == new_name
        
        # Verify with GET
        get_resp = self.session.get(f"{BASE_URL}/api/auth/profile")
        assert get_resp.status_code == 200
        assert get_resp.json()["name"] == new_name
        
        # Restore original name
        self.session.put(f"{BASE_URL}/api/auth/profile", json={"name": "Administrator"})
        print(f"Profile name updated and restored successfully")
    
    def test_update_profile_empty_name_fails(self):
        """PUT /api/auth/profile with empty name should fail"""
        resp = self.session.put(f"{BASE_URL}/api/auth/profile", json={"name": "   "})
        assert resp.status_code == 400, f"Expected 400 for empty name, got {resp.status_code}"
    
    def test_profile_requires_auth(self):
        """Profile endpoints require authentication"""
        no_auth_session = requests.Session()
        resp = no_auth_session.get(f"{BASE_URL}/api/auth/profile")
        assert resp.status_code == 401, f"Expected 401 without auth, got {resp.status_code}"


class TestClassSessions:
    """Class session CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get session"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        self.created_session_ids = []
    
    def teardown_method(self, method):
        """Cleanup created sessions"""
        for session_id in self.created_session_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/class-sessions/{session_id}")
            except:
                pass
    
    def test_create_class_session(self):
        """POST /api/class-sessions creates a new class session with tracks"""
        payload = {
            "name": "TEST_Cardio Class",
            "tracks": [
                {
                    "type": "spotify",
                    "spotify_id": "test_spotify_1",
                    "name": "Test Track 1",
                    "artist": "Test Artist",
                    "album_image": "https://example.com/image.jpg",
                    "uri": "spotify:track:test1",
                    "preview_url": "https://example.com/preview.mp3",
                    "original_duration": 180000,
                    "custom_duration": 120,
                    "transition": "crossfade"
                },
                {
                    "type": "spotify",
                    "spotify_id": "test_spotify_2",
                    "name": "Test Track 2",
                    "artist": "Test Artist 2",
                    "original_duration": 200000,
                    "custom_duration": 90,
                    "transition": "fade_out"
                }
            ],
            "total_duration": 5,
            "transition_duration": 3
        }
        resp = self.session.post(f"{BASE_URL}/api/class-sessions", json=payload)
        assert resp.status_code == 200, f"Create session failed: {resp.text}"
        data = resp.json()
        
        assert "session_id" in data
        assert data["name"] == "TEST_Cardio Class"
        assert len(data["tracks"]) == 2
        assert data["tracks"][0]["custom_duration"] == 120
        assert data["tracks"][0]["transition"] == "crossfade"
        assert data["tracks"][1]["transition"] == "fade_out"
        assert data["transition_duration"] == 3
        
        self.created_session_ids.append(data["session_id"])
        print(f"Created class session: {data['session_id']}")
        return data["session_id"]
    
    def test_list_class_sessions(self):
        """GET /api/class-sessions returns user's sessions"""
        # Create a session first
        create_resp = self.session.post(f"{BASE_URL}/api/class-sessions", json={
            "name": "TEST_List Session",
            "tracks": [{"type": "spotify", "spotify_id": "test1", "name": "Test", "artist": "Artist", "transition": "cut"}],
            "transition_duration": 2
        })
        assert create_resp.status_code == 200
        session_id = create_resp.json()["session_id"]
        self.created_session_ids.append(session_id)
        
        # List sessions
        resp = self.session.get(f"{BASE_URL}/api/class-sessions")
        assert resp.status_code == 200, f"List sessions failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        assert any(s["session_id"] == session_id for s in data)
        print(f"Found {len(data)} class sessions")
    
    def test_get_class_session_detail(self):
        """GET /api/class-sessions/{id} returns session detail"""
        # Create a session first
        create_resp = self.session.post(f"{BASE_URL}/api/class-sessions", json={
            "name": "TEST_Detail Session",
            "tracks": [{"type": "spotify", "spotify_id": "test1", "name": "Test", "artist": "Artist", "transition": "crossfade"}],
            "transition_duration": 3
        })
        assert create_resp.status_code == 200
        session_id = create_resp.json()["session_id"]
        self.created_session_ids.append(session_id)
        
        # Get detail
        resp = self.session.get(f"{BASE_URL}/api/class-sessions/{session_id}")
        assert resp.status_code == 200, f"Get session detail failed: {resp.text}"
        data = resp.json()
        assert data["session_id"] == session_id
        assert data["name"] == "TEST_Detail Session"
        assert len(data["tracks"]) == 1
        print(f"Session detail: {data['name']}")
    
    def test_update_class_session(self):
        """PUT /api/class-sessions/{id} updates session"""
        # Create a session first
        create_resp = self.session.post(f"{BASE_URL}/api/class-sessions", json={
            "name": "TEST_Update Session",
            "tracks": [{"type": "spotify", "spotify_id": "test1", "name": "Test", "artist": "Artist", "transition": "cut"}],
            "transition_duration": 2
        })
        assert create_resp.status_code == 200
        session_id = create_resp.json()["session_id"]
        self.created_session_ids.append(session_id)
        
        # Update
        update_resp = self.session.put(f"{BASE_URL}/api/class-sessions/{session_id}", json={
            "name": "TEST_Updated Session Name",
            "transition_duration": 5
        })
        assert update_resp.status_code == 200, f"Update session failed: {update_resp.text}"
        
        # Verify
        get_resp = self.session.get(f"{BASE_URL}/api/class-sessions/{session_id}")
        assert get_resp.status_code == 200
        data = get_resp.json()
        assert data["name"] == "TEST_Updated Session Name"
        assert data["transition_duration"] == 5
        print(f"Session updated successfully")
    
    def test_delete_class_session(self):
        """DELETE /api/class-sessions/{id} deletes session"""
        # Create a session first
        create_resp = self.session.post(f"{BASE_URL}/api/class-sessions", json={
            "name": "TEST_Delete Session",
            "tracks": [{"type": "spotify", "spotify_id": "test1", "name": "Test", "artist": "Artist", "transition": "cut"}],
            "transition_duration": 2
        })
        assert create_resp.status_code == 200
        session_id = create_resp.json()["session_id"]
        
        # Delete
        delete_resp = self.session.delete(f"{BASE_URL}/api/class-sessions/{session_id}")
        assert delete_resp.status_code == 200, f"Delete session failed: {delete_resp.text}"
        
        # Verify deleted
        get_resp = self.session.get(f"{BASE_URL}/api/class-sessions/{session_id}")
        assert get_resp.status_code == 404, f"Session should be deleted, got {get_resp.status_code}"
        print(f"Session deleted successfully")
    
    def test_class_session_requires_auth(self):
        """Class session endpoints require authentication"""
        no_auth_session = requests.Session()
        resp = no_auth_session.get(f"{BASE_URL}/api/class-sessions")
        assert resp.status_code == 401, f"Expected 401 without auth, got {resp.status_code}"


class TestInstructorAccess:
    """Test instructor user access (regression)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create instructor user if not exists, then login"""
        self.admin_session = requests.Session()
        admin_login = self.admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert admin_login.status_code == 200
        
        # Try to create instructor (may already exist)
        self.admin_session.post(f"{BASE_URL}/api/admin/instructors", json={
            "email": INSTRUCTOR_EMAIL,
            "password": INSTRUCTOR_PASSWORD,
            "name": "Test Instructor"
        })
        
        # Login as instructor
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": INSTRUCTOR_EMAIL,
            "password": INSTRUCTOR_PASSWORD
        })
        if login_resp.status_code != 200:
            pytest.skip(f"Instructor login failed: {login_resp.text}")
        self.user = login_resp.json()
    
    def test_instructor_can_access_songs(self):
        """Instructor user can see songs at /songs (regression - non-admin access)"""
        resp = self.session.get(f"{BASE_URL}/api/mixes")
        assert resp.status_code == 200, f"Instructor cannot access mixes: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"Instructor can access {len(data)} mixes")
    
    def test_instructor_can_search_spotify(self):
        """Spotify search regression - still works for instructor"""
        resp = self.session.get(f"{BASE_URL}/api/spotify/search?q=workout&limit=5")
        assert resp.status_code == 200, f"Spotify search failed for instructor: {resp.text}"
        data = resp.json()
        assert "tracks" in data
        assert len(data["tracks"]) > 0
        print(f"Instructor Spotify search returned {len(data['tracks'])} tracks")
    
    def test_instructor_can_access_profile(self):
        """Instructor can access their profile"""
        resp = self.session.get(f"{BASE_URL}/api/auth/profile")
        assert resp.status_code == 200, f"Instructor cannot access profile: {resp.text}"
        data = resp.json()
        assert data["email"] == INSTRUCTOR_EMAIL
        assert data["role"] == "instructor"
        print(f"Instructor profile: {data['name']}, role: {data['role']}")
    
    def test_instructor_can_create_class_session(self):
        """Instructor can create class sessions"""
        resp = self.session.post(f"{BASE_URL}/api/class-sessions", json={
            "name": "TEST_Instructor Class",
            "tracks": [{"type": "spotify", "spotify_id": "test1", "name": "Test", "artist": "Artist", "transition": "crossfade"}],
            "transition_duration": 3
        })
        assert resp.status_code == 200, f"Instructor cannot create class session: {resp.text}"
        session_id = resp.json()["session_id"]
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/class-sessions/{session_id}")
        print(f"Instructor created and deleted class session successfully")


class TestSpotifySearchRegression:
    """Spotify search regression tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200
    
    def test_spotify_search_works(self):
        """Spotify search regression - still works for admin"""
        resp = self.session.get(f"{BASE_URL}/api/spotify/search?q=fitness&limit=10")
        assert resp.status_code == 200, f"Spotify search failed: {resp.text}"
        data = resp.json()
        assert "tracks" in data
        assert len(data["tracks"]) > 0
        
        # Verify track structure
        track = data["tracks"][0]
        assert "spotify_id" in track
        assert "name" in track
        assert "artist" in track
        print(f"Spotify search returned {len(data['tracks'])} tracks")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
