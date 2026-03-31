"""
Iteration 17 - Testing Playlist Fixes
Tests for:
1. PlaylistResponse model with optional items/spotify_source fields
2. GET /api/playlists/{id} returns playlist detail without error
3. GET /api/playlists/{id}/items returns enriched items
4. Spotify endpoints return 401 when not connected (correct behavior)
5. Spotify embed iframe implementation
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@fitbeats.com"
ADMIN_PASSWORD = "Admin123!"


class TestHealthAndAuth:
    """Basic health and authentication tests"""
    
    def test_health_endpoint(self):
        """GET /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("✓ Health endpoint returns 200")
    
    def test_login_success(self):
        """POST /api/auth/login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "user_id" in data
        assert data["email"] == ADMIN_EMAIL
        print(f"✓ Login successful for {ADMIN_EMAIL}")
        return response.cookies.get("access_token")
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login with invalid credentials returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wrong@email.com", "password": "wrongpass"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly return 401")


class TestPlaylistEndpoints:
    """Tests for playlist endpoints - the main focus of this iteration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session for authenticated requests"""
        self.session = requests.Session()
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, "Login failed in setup"
    
    def test_get_my_playlists(self):
        """GET /api/playlists/mine returns playlists with items field"""
        response = self.session.get(f"{BASE_URL}/api/playlists/mine")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of playlists"
        print(f"✓ GET /api/playlists/mine returns {len(data)} playlists")
        
        # Check that each playlist has the required fields
        for playlist in data:
            assert "playlist_id" in playlist
            assert "name" in playlist
            assert "items" in playlist or "mix_ids" in playlist, "Playlist should have items or mix_ids"
            print(f"  - Playlist: {playlist['name']} (id: {playlist['playlist_id']})")
        
        return data
    
    def test_get_all_playlists(self):
        """GET /api/playlists returns playlists"""
        response = self.session.get(f"{BASE_URL}/api/playlists")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of playlists"
        print(f"✓ GET /api/playlists returns {len(data)} playlists")
        return data
    
    def test_get_playlist_detail_no_error(self):
        """GET /api/playlists/{id} returns playlist detail without error"""
        # First get list of playlists
        playlists_response = self.session.get(f"{BASE_URL}/api/playlists/mine")
        playlists = playlists_response.json()
        
        if len(playlists) == 0:
            pytest.skip("No playlists to test")
        
        # Test each playlist detail endpoint
        for playlist in playlists:
            playlist_id = playlist["playlist_id"]
            response = self.session.get(f"{BASE_URL}/api/playlists/{playlist_id}")
            assert response.status_code == 200, f"Failed for {playlist_id}: {response.status_code} - {response.text}"
            
            data = response.json()
            assert "playlist_id" in data
            assert "name" in data
            assert "user_id" in data or data.get("user_id") == ""
            assert "user_name" in data or data.get("user_name") == ""
            assert "mix_ids" in data or data.get("mix_ids") == []
            assert "items" in data or data.get("items") == []
            
            print(f"✓ GET /api/playlists/{playlist_id} returns valid response")
            print(f"  - Name: {data['name']}")
            print(f"  - Items count: {len(data.get('items', []))}")
            print(f"  - Mix IDs count: {len(data.get('mix_ids', []))}")
            print(f"  - Spotify source: {data.get('spotify_source', 'None')}")
    
    def test_get_playlist_items(self):
        """GET /api/playlists/{id}/items returns enriched items"""
        # First get list of playlists
        playlists_response = self.session.get(f"{BASE_URL}/api/playlists/mine")
        playlists = playlists_response.json()
        
        if len(playlists) == 0:
            pytest.skip("No playlists to test")
        
        # Test items endpoint for each playlist
        for playlist in playlists:
            playlist_id = playlist["playlist_id"]
            response = self.session.get(f"{BASE_URL}/api/playlists/{playlist_id}/items")
            assert response.status_code == 200, f"Failed for {playlist_id}: {response.status_code} - {response.text}"
            
            data = response.json()
            assert "items" in data, "Response should have 'items' field"
            
            items = data["items"]
            print(f"✓ GET /api/playlists/{playlist_id}/items returns {len(items)} items")
            
            # Verify item structure
            for item in items:
                assert "type" in item, "Item should have 'type' field"
                assert "name" in item, "Item should have 'name' field"
                assert "artist" in item, "Item should have 'artist' field"
                
                if item["type"] == "spotify":
                    assert "spotify_id" in item, "Spotify item should have 'spotify_id'"
                    print(f"  - Spotify track: {item['name']} by {item['artist']}")
                elif item["type"] == "mix":
                    assert "mix_id" in item, "Mix item should have 'mix_id'"
                    print(f"  - Mix: {item['name']} by {item['artist']}")
    
    def test_specific_playlist_cardio_vibes(self):
        """Test the specific 'Cardio Vibes 2026' playlist mentioned in the bug report"""
        # Search for the playlist
        playlists_response = self.session.get(f"{BASE_URL}/api/playlists/mine")
        playlists = playlists_response.json()
        
        cardio_playlist = None
        for p in playlists:
            if "Cardio" in p.get("name", "") or p.get("playlist_id") == "playlist_9ce625ab7be1":
                cardio_playlist = p
                break
        
        if not cardio_playlist:
            # Try to find any playlist with items
            for p in playlists:
                if len(p.get("items", [])) > 0 or len(p.get("mix_ids", [])) > 0:
                    cardio_playlist = p
                    break
        
        if not cardio_playlist:
            print("⚠ No playlist with items found to test detail view")
            return
        
        playlist_id = cardio_playlist["playlist_id"]
        print(f"Testing playlist: {cardio_playlist['name']} ({playlist_id})")
        
        # Test detail endpoint
        response = self.session.get(f"{BASE_URL}/api/playlists/{playlist_id}")
        assert response.status_code == 200, f"Detail endpoint failed: {response.status_code} - {response.text}"
        
        data = response.json()
        print(f"✓ Playlist detail loaded successfully")
        print(f"  - Name: {data['name']}")
        print(f"  - User: {data.get('user_name', 'N/A')}")
        print(f"  - Items: {len(data.get('items', []))}")
        print(f"  - Spotify source: {data.get('spotify_source', 'None')}")
        
        # Test items endpoint
        items_response = self.session.get(f"{BASE_URL}/api/playlists/{playlist_id}/items")
        assert items_response.status_code == 200, f"Items endpoint failed: {items_response.status_code}"
        
        items_data = items_response.json()
        print(f"✓ Playlist items loaded: {len(items_data.get('items', []))} tracks")


class TestSpotifyEndpoints:
    """Tests for Spotify endpoints - should return 401 when not connected"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session for authenticated requests"""
        self.session = requests.Session()
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, "Login failed in setup"
    
    def test_spotify_playlists_returns_401_when_not_connected(self):
        """GET /api/spotify/playlists returns 401 when Spotify not connected"""
        response = self.session.get(f"{BASE_URL}/api/spotify/playlists")
        # Admin user doesn't have Spotify connected, so this should return 401
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/spotify/playlists correctly returns 401 when not connected")
    
    def test_spotify_import_returns_401_when_not_connected(self):
        """POST /api/spotify/playlists/{id}/import returns 401 when not connected"""
        response = self.session.post(f"{BASE_URL}/api/spotify/playlists/test_playlist_id/import")
        # Admin user doesn't have Spotify connected, so this should return 401
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ POST /api/spotify/playlists/{id}/import correctly returns 401 when not connected")
    
    def test_spotify_search_works(self):
        """GET /api/spotify/search works with client credentials"""
        response = self.session.get(f"{BASE_URL}/api/spotify/search?q=workout")
        assert response.status_code == 200, f"Search failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "tracks" in data
        print(f"✓ Spotify search works, found {len(data['tracks'])} tracks")


class TestOtherEndpoints:
    """Tests for other endpoints to ensure they still work"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session for authenticated requests"""
        self.session = requests.Session()
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, "Login failed in setup"
    
    def test_get_albums(self):
        """GET /api/albums returns albums list"""
        response = self.session.get(f"{BASE_URL}/api/albums")
        assert response.status_code == 200, f"Failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/albums returns {len(data)} albums")
    
    def test_get_mixes(self):
        """GET /api/mixes returns mixes list"""
        response = self.session.get(f"{BASE_URL}/api/mixes")
        assert response.status_code == 200, f"Failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/mixes returns {len(data)} mixes")
    
    def test_get_class_sessions(self):
        """GET /api/class-sessions returns sessions list"""
        response = self.session.get(f"{BASE_URL}/api/class-sessions")
        assert response.status_code == 200, f"Failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/class-sessions returns {len(data)} sessions")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
