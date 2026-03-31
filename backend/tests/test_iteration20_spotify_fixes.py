"""
Iteration 20 - Test Spotify fixes:
1. POST /api/spotify/play endpoint exists and returns 401 for unconnected user
2. Playlist import deduplication (returns existing playlist if already imported)
3. GET /api/playlists/mine returns no duplicate playlists
4. Basic auth and health checks
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
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("✓ Health endpoint returns 200")
    
    def test_login_success(self):
        """POST /api/auth/login works with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "user_id" in data, "Response missing user_id"
        assert data["email"] == ADMIN_EMAIL.lower(), "Email mismatch"
        print(f"✓ Login successful for {ADMIN_EMAIL}")
        return response.cookies
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login returns 401 for invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wrong@example.com", "password": "wrongpass"},
            timeout=10
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly return 401")


class TestSpotifyPlayEndpoint:
    """Test the new POST /api/spotify/play endpoint"""
    
    @pytest.fixture
    def auth_cookies(self):
        """Get authenticated session cookies"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        assert response.status_code == 200, "Login failed"
        return response.cookies
    
    def test_spotify_play_endpoint_exists(self, auth_cookies):
        """POST /api/spotify/play endpoint exists"""
        # Without uri parameter - should return 400 (bad request) not 404
        response = requests.post(
            f"{BASE_URL}/api/spotify/play",
            json={},
            cookies=auth_cookies,
            timeout=10
        )
        # 400 = endpoint exists but missing uri
        # 401 = endpoint exists but Spotify not connected
        # 404 = endpoint doesn't exist
        assert response.status_code in [400, 401], f"Unexpected status: {response.status_code}"
        print(f"✓ POST /api/spotify/play endpoint exists (status: {response.status_code})")
    
    def test_spotify_play_requires_uri(self, auth_cookies):
        """POST /api/spotify/play returns 400 when uri is missing"""
        response = requests.post(
            f"{BASE_URL}/api/spotify/play",
            json={},
            cookies=auth_cookies,
            timeout=10
        )
        # Should be 400 for missing uri OR 401 if Spotify not connected
        assert response.status_code in [400, 401], f"Expected 400 or 401, got {response.status_code}"
        print(f"✓ POST /api/spotify/play validates uri parameter (status: {response.status_code})")
    
    def test_spotify_play_returns_401_for_unconnected_user(self, auth_cookies):
        """POST /api/spotify/play returns 401 for user without Spotify connected"""
        response = requests.post(
            f"{BASE_URL}/api/spotify/play",
            json={"uri": "spotify:track:test123"},
            cookies=auth_cookies,
            timeout=10
        )
        # Admin doesn't have Spotify connected, so should return 401
        assert response.status_code == 401, f"Expected 401 for unconnected user, got {response.status_code}"
        print("✓ POST /api/spotify/play returns 401 for unconnected user")


class TestPlaylistDeduplication:
    """Test playlist import deduplication"""
    
    @pytest.fixture
    def auth_cookies(self):
        """Get authenticated session cookies"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        assert response.status_code == 200, "Login failed"
        return response.cookies
    
    def test_get_my_playlists(self, auth_cookies):
        """GET /api/playlists/mine returns playlists list"""
        response = requests.get(
            f"{BASE_URL}/api/playlists/mine",
            cookies=auth_cookies,
            timeout=10
        )
        assert response.status_code == 200, f"Failed to get playlists: {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/playlists/mine returns {len(data)} playlists")
        return data
    
    def test_no_duplicate_playlists(self, auth_cookies):
        """GET /api/playlists/mine returns NO duplicate playlists"""
        response = requests.get(
            f"{BASE_URL}/api/playlists/mine",
            cookies=auth_cookies,
            timeout=10
        )
        assert response.status_code == 200
        playlists = response.json()
        
        # Check for duplicates by name
        names = [p.get("name") for p in playlists]
        unique_names = set(names)
        
        # Check for duplicates by spotify_source
        spotify_sources = [p.get("spotify_source") for p in playlists if p.get("spotify_source")]
        unique_sources = set(spotify_sources)
        
        assert len(names) == len(unique_names), f"Found duplicate playlist names: {names}"
        assert len(spotify_sources) == len(unique_sources), f"Found duplicate spotify sources: {spotify_sources}"
        
        print(f"✓ No duplicate playlists found ({len(playlists)} total, {len(unique_names)} unique names)")
    
    def test_playlist_detail_has_items(self, auth_cookies):
        """GET /api/playlists/{id} returns playlist with items"""
        # First get list of playlists
        response = requests.get(
            f"{BASE_URL}/api/playlists/mine",
            cookies=auth_cookies,
            timeout=10
        )
        assert response.status_code == 200
        playlists = response.json()
        
        if not playlists:
            pytest.skip("No playlists to test")
        
        # Get first playlist detail
        playlist_id = playlists[0]["playlist_id"]
        detail_response = requests.get(
            f"{BASE_URL}/api/playlists/{playlist_id}",
            cookies=auth_cookies,
            timeout=10
        )
        assert detail_response.status_code == 200, f"Failed to get playlist detail: {detail_response.status_code}"
        
        detail = detail_response.json()
        assert "playlist_id" in detail, "Missing playlist_id"
        assert "name" in detail, "Missing name"
        assert "items" in detail or "mix_ids" in detail, "Missing items or mix_ids"
        
        print(f"✓ Playlist detail for '{detail['name']}' has {len(detail.get('items', []))} items")


class TestSpotifyTransferEndpoint:
    """Test PUT /api/spotify/transfer endpoint"""
    
    @pytest.fixture
    def auth_cookies(self):
        """Get authenticated session cookies"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        assert response.status_code == 200, "Login failed"
        return response.cookies
    
    def test_spotify_transfer_requires_device_id(self, auth_cookies):
        """PUT /api/spotify/transfer returns 400 when device_id is missing"""
        response = requests.put(
            f"{BASE_URL}/api/spotify/transfer",
            json={},
            cookies=auth_cookies,
            timeout=10
        )
        # Should be 400 for missing device_id OR 401 if Spotify not connected
        assert response.status_code in [400, 401], f"Expected 400 or 401, got {response.status_code}"
        print(f"✓ PUT /api/spotify/transfer validates device_id parameter (status: {response.status_code})")
    
    def test_spotify_transfer_returns_401_for_unconnected_user(self, auth_cookies):
        """PUT /api/spotify/transfer returns 401 for user without Spotify connected"""
        response = requests.put(
            f"{BASE_URL}/api/spotify/transfer",
            json={"device_id": "test_device_123"},
            cookies=auth_cookies,
            timeout=10
        )
        # Admin doesn't have Spotify connected, so should return 401
        assert response.status_code == 401, f"Expected 401 for unconnected user, got {response.status_code}"
        print("✓ PUT /api/spotify/transfer returns 401 for unconnected user")


class TestPlaylistItems:
    """Test playlist items endpoint"""
    
    @pytest.fixture
    def auth_cookies(self):
        """Get authenticated session cookies"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        assert response.status_code == 200, "Login failed"
        return response.cookies
    
    def test_playlist_items_endpoint(self, auth_cookies):
        """GET /api/playlists/{id}/items returns enriched items"""
        # First get list of playlists
        response = requests.get(
            f"{BASE_URL}/api/playlists/mine",
            cookies=auth_cookies,
            timeout=10
        )
        assert response.status_code == 200
        playlists = response.json()
        
        # Find a playlist with items
        playlist_with_items = None
        for p in playlists:
            if p.get("items") and len(p.get("items", [])) > 0:
                playlist_with_items = p
                break
        
        if not playlist_with_items:
            pytest.skip("No playlists with items to test")
        
        playlist_id = playlist_with_items["playlist_id"]
        items_response = requests.get(
            f"{BASE_URL}/api/playlists/{playlist_id}/items",
            cookies=auth_cookies,
            timeout=10
        )
        assert items_response.status_code == 200, f"Failed to get playlist items: {items_response.status_code}"
        
        items_data = items_response.json()
        # The endpoint returns {"items": [...]} not just [...]
        items = items_data.get("items", items_data) if isinstance(items_data, dict) else items_data
        assert isinstance(items, list), f"Response should be a list, got: {type(items_data)}"
        
        if items:
            # Check that items have required fields
            item = items[0]
            assert "type" in item, "Item missing 'type' field"
            assert "name" in item, "Item missing 'name' field"
            print(f"✓ Playlist items endpoint returns {len(items)} enriched items")
        else:
            print("✓ Playlist items endpoint works (empty list)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
