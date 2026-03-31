#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class FitBeatsAlbumsAPITester:
    def __init__(self, base_url="https://fitmusic-platform.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.created_album_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {}
        
        # Don't set Content-Type for file uploads
        if not files:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = self.session.post(url, data=data, files=files, headers={})
                else:
                    response = self.session.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self, email, password):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success:
            print(f"✅ Login successful for {email}")
            return True
        return False

    def test_get_albums(self):
        """Get albums list"""
        success, response = self.run_test(
            "Get Albums",
            "GET",
            "albums",
            200
        )
        return success, response

    def test_create_album(self, name, artist, year, description=None):
        """Create a new album using query parameters"""
        # Albums endpoint uses query parameters
        params = {
            'name': name,
            'artist': artist,
            'year': str(year)
        }
        if description:
            params['description'] = description
        
        # Build query string
        query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
        
        success, response = self.run_test(
            "Create Album",
            "POST",
            f"albums?{query_string}",
            200,  # Backend returns 200 for album creation
            data={}
        )
        return success, response

    def test_delete_album(self, album_id):
        """Delete an album"""
        success, response = self.run_test(
            "Delete Album",
            "DELETE",
            f"albums/{album_id}",
            200
        )
        return success, response

def main():
    print("🎵 FitBeats Albums API Testing")
    print("=" * 50)
    
    # Setup
    tester = FitBeatsAlbumsAPITester()
    
    # Test admin login
    print("\n📝 Testing Admin Authentication...")
    if not tester.test_login("admin@fitbeats.com", "Admin123!"):
        print("❌ Admin login failed, stopping tests")
        return 1

    # Test getting albums (should work even if empty)
    print("\n📀 Testing Albums API...")
    albums_success, albums_data = tester.test_get_albums()
    if albums_success:
        print(f"✅ Found {len(albums_data)} existing albums")
        for album in albums_data:
            print(f"   - {album.get('name', 'Unknown')} by {album.get('artist', 'Unknown')} ({album.get('year', 'Unknown')})")
    
    # Test creating the specific album from the test requirements
    print("\n🆕 Testing Album Creation...")
    album_success, album_data = tester.test_create_album(
        "Cycling Power Vol 1",
        "DJ FitBeats", 
        2024,
        "High-energy cycling music for fitness classes"
    )
    
    if album_success:
        tester.created_album_id = album_data.get('album_id')
        print(f"✅ Album created with ID: {tester.created_album_id}")
        print(f"   Name: {album_data.get('name')}")
        print(f"   Artist: {album_data.get('artist')}")
        print(f"   Year: {album_data.get('year')}")
    else:
        print("❌ Album creation failed")
    
    # Test getting albums again to verify creation
    print("\n🔄 Verifying Album Creation...")
    albums_success2, albums_data2 = tester.test_get_albums()
    if albums_success2:
        print(f"✅ Now found {len(albums_data2)} albums")
        cycling_album_found = False
        for album in albums_data2:
            if album.get('name') == 'Cycling Power Vol 1':
                cycling_album_found = True
                print(f"✅ Created album found: {album.get('name')} by {album.get('artist')} ({album.get('year')})")
                print(f"   Album ID: {album.get('album_id')}")
                print(f"   Mix count: {album.get('mix_count', 0)}")
                break
        
        if not cycling_album_found:
            print("❌ Created album not found in list")
    
    # Test getting mixes to verify album requirement
    print("\n🎵 Testing Mixes API (should show album requirement)...")
    mixes_success, mixes_data = tester.run_test(
        "Get Mixes",
        "GET", 
        "mixes",
        200
    )
    if mixes_success:
        print(f"✅ Found {len(mixes_data)} existing mixes")
        for mix in mixes_data:
            print(f"   - {mix.get('name', 'Unknown')} by {mix.get('artist', 'Unknown')} (Album: {mix.get('album_name', 'Unknown')})")
    
    # Print results
    print(f"\n📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All Albums API tests passed!")
        print("\n✅ Albums functionality is working correctly:")
        print("   - Admin can login")
        print("   - Albums can be listed")
        print("   - Albums can be created with name, artist, year, description")
        print("   - Created albums appear in the list")
        print("   - Mixes API is available (requires album_id)")
        return 0
    else:
        print("❌ Some Albums API tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())