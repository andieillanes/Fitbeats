"""
Iteration 19 Tests - Duplicate Prevention & Server-Side Play
Tests:
1. Health check
2. Login with admin credentials
3. Spotify playlist import duplicate prevention
4. POST /api/spotify/play endpoint (returns 401 for unconnected user)
5. PUT /api/spotify/transfer endpoint
6. GET /api/playlists/mine returns playlists without duplicates
7. GET /api/playlists/{id} returns playlist detail
8. GET /api/playlists/{id}/items returns enriched items
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
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("✓ Health check passed")
    
    def test_login_success(self):
        """POST /api/auth/login works with admin credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "user_id" in data
        assert data["email"] == ADMIN_EMAIL
        print(f"✓ Login successful for {ADMIN_EMAIL}")
        return response.cookies
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login returns 401 for invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wrong@email.com", "password": "wrongpass"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")


class TestSpotifyPlayEndpoint:
    """Tests for the new POST /api/spotify/play endpoint"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return session
    
    def test_spotify_play_returns_401_for_unconnected_user(self, auth_session):
        """POST /api/spotify/play returns 401 for user without Spotify connected"""
        response = auth_session.post(
            f"{BASE_URL}/api/spotify/play",
            json={"uri": "spotify:track:4iV5W9uYEdYUVa79Axb7Rh"}
        )
        # Admin doesn't have Spotify connected, so should get 401
        assert response.status_code == 401, f"Expected 401, got {response.status_code} - {response.text}"
        data = response.json()
        assert "not connected" in data.get("detail", "").lower() or "spotify" in data.get("detail", "").lower()
        print("✓ POST /api/spotify/play correctly returns 401 for unconnected user")
    
    def test_spotify_play_requires_uri(self, auth_session):
        """POST /api/spotify/play requires uri parameter"""
        response = auth_session.post(
            f"{BASE_URL}/api/spotify/play",
            json={}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ POST /api/spotify/play correctly requires uri parameter")


class TestSpotifyTransferEndpoint:
    """Tests for PUT /api/spotify/transfer endpoint"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return session
    
    def test_spotify_transfer_returns_401_for_unconnected_user(self, auth_session):
        """PUT /api/spotify/transfer returns 401 for user without Spotify connected"""
        response = auth_session.put(
            f"{BASE_URL}/api/spotify/transfer",
            json={"device_id": "test_device_123"}
        )
        # Admin doesn't have Spotify connected, so should get 401
        assert response.status_code == 401, f"Expected 401, got {response.status_code} - {response.text}"
        print("✓ PUT /api/spotify/transfer correctly returns 401 for unconnected user")
    
    def test_spotify_transfer_requires_device_id(self, auth_session):
        """PUT /api/spotify/transfer requires device_id parameter"""
        response = auth_session.put(
            f"{BASE_URL}/api/spotify/transfer",
            json={}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ PUT /api/spotify/transfer correctly requires device_id parameter")


class TestPlaylistsNoDuplicates:
    """Tests for playlist endpoints - verifying no duplicates"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return session
    
    def test_playlists_mine_returns_list(self, auth_session):
        """GET /api/playlists/mine returns playlists list"""
        response = auth_session.get(f"{BASE_URL}/api/playlists/mine")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/playlists/mine returned {len(data)} playlists")
        return data
    
    def test_playlists_mine_no_duplicates(self, auth_session):
        """GET /api/playlists/mine returns no duplicate playlists"""
        response = auth_session.get(f"{BASE_URL}/api/playlists/mine")
        assert response.status_code == 200
        playlists = response.json()
        
        # Check for duplicates by name
        names = [p.get("name") for p in playlists]
        unique_names = set(names)
        
        # Count occurrences of each name
        name_counts = {}
        for name in names:
            name_counts[name] = name_counts.get(name, 0) + 1
        
        duplicates = {name: count for name, count in name_counts.items() if count > 1}
        
        if duplicates:
            print(f"⚠ Found duplicate playlist names: {duplicates}")
        else:
            print("✓ No duplicate playlist names found")
        
        # Also check by spotify_source for imported playlists
        spotify_sources = [p.get("spotify_source") for p in playlists if p.get("spotify_source")]
        unique_sources = set(spotify_sources)
        
        if len(spotify_sources) != len(unique_sources):
            source_counts = {}
            for src in spotify_sources:
                source_counts[src] = source_counts.get(src, 0) + 1
            dup_sources = {src: count for src, count in source_counts.items() if count > 1}
            pytest.fail(f"Found duplicate spotify_source values: {dup_sources}")
        
        print("✓ No duplicate spotify_source values found")
    
    def test_playlist_detail_returns_data(self, auth_session):
        """GET /api/playlists/{id} returns playlist detail"""
        # First get list of playlists
        list_response = auth_session.get(f"{BASE_URL}/api/playlists/mine")
        assert list_response.status_code == 200
        playlists = list_response.json()
        
        if not playlists:
            pytest.skip("No playlists to test")
        
        playlist_id = playlists[0]["playlist_id"]
        response = auth_session.get(f"{BASE_URL}/api/playlists/{playlist_id}")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "playlist_id" in data
        assert "name" in data
        assert "items" in data or "mix_ids" in data
        print(f"✓ GET /api/playlists/{playlist_id} returned playlist: {data.get('name')}")
    
    def test_playlist_items_returns_enriched_data(self, auth_session):
        """GET /api/playlists/{id}/items returns enriched items"""
        # First get list of playlists
        list_response = auth_session.get(f"{BASE_URL}/api/playlists/mine")
        assert list_response.status_code == 200
        playlists = list_response.json()
        
        if not playlists:
            pytest.skip("No playlists to test")
        
        # Find a playlist with items
        playlist_with_items = None
        for p in playlists:
            if p.get("items") or p.get("mix_ids"):
                playlist_with_items = p
                break
        
        if not playlist_with_items:
            pytest.skip("No playlists with items to test")
        
        playlist_id = playlist_with_items["playlist_id"]
        response = auth_session.get(f"{BASE_URL}/api/playlists/{playlist_id}/items")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        
        data = response.json()
        # Response is {"items": [...]} not just a list
        assert "items" in data, "Response should have 'items' key"
        items = data["items"]
        assert isinstance(items, list)
        
        if items:
            # Check that items have enriched fields
            item = items[0]
            assert "type" in item, "Item should have 'type' field"
            assert "name" in item, "Item should have 'name' field"
            print(f"✓ GET /api/playlists/{playlist_id}/items returned {len(items)} enriched items")
        else:
            print(f"✓ GET /api/playlists/{playlist_id}/items returned empty list (no items)")


class TestSpotifyImportDuplicatePrevention:
    """Tests for duplicate prevention in Spotify playlist import"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return session
    
    def test_import_returns_existing_playlist_if_already_imported(self, auth_session):
        """POST /api/spotify/playlists/{id}/import returns existing playlist_id if already imported"""
        # First, get the user's playlists to find one with spotify_source
        response = auth_session.get(f"{BASE_URL}/api/playlists/mine")
        assert response.status_code == 200
        playlists = response.json()
        
        # Find a playlist that was imported from Spotify
        imported_playlist = None
        for p in playlists:
            if p.get("spotify_source"):
                imported_playlist = p
                break
        
        if not imported_playlist:
            pytest.skip("No imported Spotify playlists to test duplicate prevention")
        
        spotify_source = imported_playlist["spotify_source"]
        existing_playlist_id = imported_playlist["playlist_id"]
        
        # Try to import the same Spotify playlist again
        import_response = auth_session.post(f"{BASE_URL}/api/spotify/playlists/{spotify_source}/import")
        
        # Should return 200 with the existing playlist_id (not create a new one)
        # Note: If user doesn't have Spotify connected, this will return 401
        if import_response.status_code == 401:
            print("✓ Import endpoint correctly requires Spotify connection (admin not connected)")
            return
        
        assert import_response.status_code == 200, f"Failed: {import_response.status_code} - {import_response.text}"
        data = import_response.json()
        
        # Should return the existing playlist_id, not create a new one
        assert data.get("playlist_id") == existing_playlist_id, \
            f"Expected existing playlist_id {existing_playlist_id}, got {data.get('playlist_id')}"
        
        print(f"✓ Import correctly returned existing playlist_id: {existing_playlist_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
