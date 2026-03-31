"""
FitBeats API Tests - Spotify Integration & Playlist Items
Tests: Login, Spotify Search, Playlist CRUD, Mixed Items (Spotify + Local Mixes)
Note: Auth uses httpOnly cookies, so we use requests.Session to maintain cookies
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@fitbeats.com"
ADMIN_PASSWORD = "Admin123!"


@pytest.fixture(scope="module")
def session():
    """Create a session that maintains cookies"""
    s = requests.Session()
    # Login to get the cookie
    response = s.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Login failed: {response.text}")
    print(f"✓ Logged in as {ADMIN_EMAIL}")
    return s


class TestAuth:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test admin login with correct credentials"""
        s = requests.Session()
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify user data in response
        assert "user_id" in data, "user_id not in response"
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        
        # Verify cookie was set
        assert "access_token" in s.cookies, "access_token cookie not set"
        print(f"✓ Login successful for {ADMIN_EMAIL}")
        print(f"  User ID: {data['user_id']}")
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")
    
    def test_auth_me_endpoint(self, session):
        """Test /auth/me endpoint returns current user"""
        response = session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        print(f"✓ /auth/me returns correct user: {data['name']}")


class TestSpotifySearch:
    """Spotify search endpoint tests"""
    
    def test_spotify_search_workout(self, session):
        """Test Spotify search with 'workout' query"""
        response = session.get(
            f"{BASE_URL}/api/spotify/search",
            params={"q": "workout", "limit": 10}
        )
        assert response.status_code == 200, f"Spotify search failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "tracks" in data, "tracks not in response"
        assert "total" in data, "total not in response"
        assert len(data["tracks"]) > 0, "No tracks returned"
        
        # Verify track structure
        track = data["tracks"][0]
        required_fields = ["spotify_id", "name", "artist", "album_image", "duration_ms", "uri"]
        for field in required_fields:
            assert field in track, f"Missing field: {field}"
        
        assert track["type"] == "spotify", "Track type should be 'spotify'"
        print(f"✓ Spotify search returned {len(data['tracks'])} tracks")
        print(f"  First track: {track['name']} by {track['artist']}")
        return data["tracks"]
    
    def test_spotify_search_edm(self, session):
        """Test Spotify search with 'EDM' query"""
        response = session.get(
            f"{BASE_URL}/api/spotify/search",
            params={"q": "EDM", "limit": 5}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["tracks"]) > 0
        print(f"✓ EDM search returned {len(data['tracks'])} tracks")
    
    def test_spotify_search_cardio(self, session):
        """Test Spotify search with 'cardio' query"""
        response = session.get(
            f"{BASE_URL}/api/spotify/search",
            params={"q": "cardio", "limit": 5}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["tracks"]) > 0
        print(f"✓ Cardio search returned {len(data['tracks'])} tracks")
    
    def test_spotify_search_requires_auth(self):
        """Test that Spotify search requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/spotify/search",
            params={"q": "test"}
        )
        assert response.status_code == 401, "Should require authentication"
        print("✓ Spotify search correctly requires authentication")


class TestMixesAndAlbums:
    """Test existing mixes and albums in the database"""
    
    def test_get_albums(self, session):
        """Test getting albums list"""
        response = session.get(f"{BASE_URL}/api/albums")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} albums")
        if data:
            print(f"  First album: {data[0]['name']}")
        return data
    
    def test_get_mixes(self, session):
        """Test getting mixes list"""
        response = session.get(f"{BASE_URL}/api/mixes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} mixes")
        if data:
            print(f"  First mix: {data[0]['name']}")
        return data
    
    def test_search_mixes(self, session):
        """Test searching mixes"""
        response = session.get(
            f"{BASE_URL}/api/mixes",
            params={"search": "workout"}
        )
        assert response.status_code == 200
        print("✓ Mix search endpoint working")


class TestPlaylistCRUD:
    """Playlist CRUD operations"""
    
    def test_create_playlist(self, session):
        """Test creating a new playlist"""
        response = session.post(
            f"{BASE_URL}/api/playlists",
            json={
                "name": "TEST_New Playlist",
                "description": "Created via API test",
                "is_public": True
            }
        )
        assert response.status_code in [200, 201], f"Create failed: {response.text}"
        data = response.json()
        assert data["name"] == "TEST_New Playlist"
        assert data["is_public"] == True
        assert "playlist_id" in data
        
        # Verify by GET
        get_response = session.get(f"{BASE_URL}/api/playlists/{data['playlist_id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["name"] == "TEST_New Playlist"
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/playlists/{data['playlist_id']}")
        print("✓ Playlist creation and verification successful")
    
    def test_get_my_playlists(self, session):
        """Test getting user's playlists"""
        response = session.get(f"{BASE_URL}/api/playlists/mine")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} playlists")


class TestPlaylistItems:
    """Playlist items (mixed Spotify + local mixes) tests"""
    
    @pytest.fixture(scope="class")
    def test_playlist(self, session):
        """Create a test playlist for item tests"""
        response = session.post(
            f"{BASE_URL}/api/playlists",
            json={
                "name": "TEST_Mixed Items Playlist",
                "description": "Testing mixed items",
                "is_public": False
            }
        )
        assert response.status_code in [200, 201], f"Failed to create playlist: {response.text}"
        data = response.json()
        print(f"✓ Created test playlist: {data['playlist_id']}")
        yield data
        # Cleanup
        session.delete(f"{BASE_URL}/api/playlists/{data['playlist_id']}")
        print(f"✓ Cleaned up test playlist")
    
    @pytest.fixture(scope="class")
    def spotify_track(self, session):
        """Get a Spotify track for testing"""
        response = session.get(
            f"{BASE_URL}/api/spotify/search",
            params={"q": "workout", "limit": 1}
        )
        tracks = response.json().get("tracks", [])
        if tracks:
            return tracks[0]
        pytest.skip("No Spotify tracks available")
    
    @pytest.fixture(scope="class")
    def local_mix(self, session):
        """Get a local mix for testing"""
        response = session.get(f"{BASE_URL}/api/mixes")
        mixes = response.json()
        if mixes and len(mixes) > 0:
            return mixes[0]
        pytest.skip("No local mixes available")
    
    def test_add_spotify_track_to_playlist(self, session, test_playlist, spotify_track):
        """Test adding a Spotify track to playlist"""
        playlist_id = test_playlist["playlist_id"]
        
        response = session.post(
            f"{BASE_URL}/api/playlists/{playlist_id}/items",
            json={
                "type": "spotify",
                "spotify_id": spotify_track["spotify_id"],
                "name": spotify_track["name"],
                "artist": spotify_track["artist"],
                "album": spotify_track.get("album"),
                "album_image": spotify_track.get("album_image"),
                "duration_ms": spotify_track.get("duration_ms"),
                "uri": spotify_track.get("uri"),
                "preview_url": spotify_track.get("preview_url")
            }
        )
        assert response.status_code == 200, f"Failed to add Spotify track: {response.text}"
        print(f"✓ Added Spotify track '{spotify_track['name']}' to playlist")
    
    def test_add_local_mix_to_playlist(self, session, test_playlist, local_mix):
        """Test adding a local mix to playlist"""
        playlist_id = test_playlist["playlist_id"]
        
        response = session.post(
            f"{BASE_URL}/api/playlists/{playlist_id}/items",
            json={
                "type": "mix",
                "mix_id": local_mix["mix_id"]
            }
        )
        assert response.status_code == 200, f"Failed to add mix: {response.text}"
        print(f"✓ Added local mix '{local_mix['name']}' to playlist")
    
    def test_get_playlist_items_enriched(self, session, test_playlist, spotify_track, local_mix):
        """Test getting enriched playlist items with type field"""
        playlist_id = test_playlist["playlist_id"]
        
        # First add items if not already added
        session.post(
            f"{BASE_URL}/api/playlists/{playlist_id}/items",
            json={"type": "spotify", "spotify_id": spotify_track["spotify_id"], 
                  "name": spotify_track["name"], "artist": spotify_track["artist"]}
        )
        session.post(
            f"{BASE_URL}/api/playlists/{playlist_id}/items",
            json={"type": "mix", "mix_id": local_mix["mix_id"]}
        )
        
        response = session.get(f"{BASE_URL}/api/playlists/{playlist_id}/items")
        assert response.status_code == 200, f"Failed to get items: {response.text}"
        data = response.json()
        
        assert "items" in data, "items not in response"
        items = data["items"]
        
        # Check that we have both types
        types = [item.get("type") for item in items]
        print(f"✓ Playlist items types: {types}")
        
        # Verify Spotify item structure
        spotify_items = [i for i in items if i.get("type") == "spotify"]
        if spotify_items:
            si = spotify_items[0]
            assert "spotify_id" in si
            assert "name" in si
            assert "artist" in si
            print(f"  Spotify item: {si['name']}")
        
        # Verify mix item structure
        mix_items = [i for i in items if i.get("type") == "mix"]
        if mix_items:
            mi = mix_items[0]
            assert "mix_id" in mi
            assert "name" in mi
            print(f"  Mix item: {mi['name']}")
        
        print(f"✓ Retrieved {len(items)} enriched playlist items")
    
    def test_remove_item_from_playlist(self, session, test_playlist):
        """Test removing an item from playlist by index"""
        playlist_id = test_playlist["playlist_id"]
        
        # Get current items
        get_response = session.get(f"{BASE_URL}/api/playlists/{playlist_id}/items")
        items_before = get_response.json().get("items", [])
        
        if len(items_before) == 0:
            pytest.skip("No items to remove")
        
        # Remove first item (index 0)
        response = session.delete(f"{BASE_URL}/api/playlists/{playlist_id}/items/0")
        assert response.status_code == 200, f"Failed to remove item: {response.text}"
        
        # Verify removal
        get_response2 = session.get(f"{BASE_URL}/api/playlists/{playlist_id}/items")
        items_after = get_response2.json().get("items", [])
        assert len(items_after) == len(items_before) - 1, "Item count should decrease by 1"
        print(f"✓ Removed item from playlist (before: {len(items_before)}, after: {len(items_after)})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
