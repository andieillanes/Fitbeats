#!/usr/bin/env python3
"""
FitBeats Backend API Testing Suite
Tests all endpoints for the FitBeats fitness music platform
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class FitBeatsAPITester:
    def __init__(self, base_url="https://fitmusic-platform.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_session = requests.Session()
        self.instructor_session = requests.Session()
        self.admin_authenticated = False
        self.instructor_authenticated = False
        self.test_studio_id = None
        self.test_instructor_id = None
        self.test_playlist_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None, 
                 files: Optional[Dict] = None, session: Optional[requests.Session] = None) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)

        # Use provided session or create a new one
        if session is None:
            session = requests.Session()

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = session.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for multipart/form-data
                    test_headers.pop('Content-Type', None)
                    response = session.post(url, data=data, files=files, headers=test_headers, timeout=60)
                else:
                    response = session.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = session.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = session.delete(url, headers=test_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                self.log(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:500]
                })

            try:
                return success, response.json() if response.text else {}
            except:
                return success, {'raw_response': response.text}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}", "ERROR")
            self.failed_tests.append({
                'name': name,
                'error': str(e)
            })
            return False, {}

    def test_health_check(self):
        """Test basic health endpoints"""
        self.log("=== HEALTH CHECK TESTS ===")
        
        # Test root endpoint
        self.run_test("Root endpoint", "GET", "/", 200)
        
        # Test health endpoint
        self.run_test("Health check", "GET", "/health", 200)

    def test_admin_auth(self):
        """Test admin authentication"""
        self.log("=== ADMIN AUTHENTICATION TESTS ===")
        
        # Test admin login
        success, response = self.run_test(
            "Admin login",
            "POST",
            "/auth/login",
            200,
            data={
                "email": "admin@fitbeats.com",
                "password": "Admin123!"
            },
            session=self.admin_session
        )
        
        if success and 'user_id' in response:
            self.admin_authenticated = True
            self.log(f"Admin logged in successfully: {response.get('name', 'Admin')}")
            return True
        else:
            self.log("❌ Admin login failed - cannot continue admin tests", "ERROR")
            return False

    def test_instructor_registration_and_auth(self):
        """Test instructor registration and authentication"""
        self.log("=== INSTRUCTOR REGISTRATION & AUTH TESTS ===")
        
        # Test instructor registration
        instructor_email = f"test_instructor_{datetime.now().strftime('%H%M%S')}@test.com"
        success, response = self.run_test(
            "Instructor registration",
            "POST",
            "/auth/register",
            200,
            data={
                "email": instructor_email,
                "password": "Test123!",
                "name": "Test Instructor"
            },
            session=self.instructor_session
        )
        
        if success:
            self.test_instructor_id = response.get('user_id')
            self.instructor_authenticated = True
            
            # Test instructor login with a new session
            new_instructor_session = requests.Session()
            success, login_response = self.run_test(
                "Instructor login",
                "POST",
                "/auth/login",
                200,
                data={
                    "email": instructor_email,
                    "password": "Test123!"
                },
                session=new_instructor_session
            )
            if success:
                self.instructor_session = new_instructor_session
            return success
        
        return False

    def test_studio_management(self):
        """Test studio CRUD operations (admin only)"""
        if not self.admin_authenticated:
            self.log("Skipping studio tests - admin not authenticated", "WARN")
            return
            
        self.log("=== STUDIO MANAGEMENT TESTS ===")
        
        # Create studio
        success, response = self.run_test(
            "Create studio",
            "POST",
            "/studios",
            200,
            data={
                "name": "Test Studio",
                "address": "123 Test Street",
                "phone": "+1234567890"
            },
            session=self.admin_session
        )
        
        if success:
            self.test_studio_id = response.get('studio_id')
            
            # List studios
            self.run_test("List studios", "GET", "/studios", 200, session=self.admin_session)
            
            # Update studio
            if self.test_studio_id:
                self.run_test(
                    "Update studio",
                    "PUT",
                    f"/studios/{self.test_studio_id}",
                    200,
                    data={
                        "name": "Updated Test Studio",
                        "address": "456 Updated Street",
                        "phone": "+0987654321"
                    },
                    session=self.admin_session
                )

    def test_instructor_management(self):
        """Test instructor management (admin only)"""
        if not self.admin_authenticated:
            self.log("Skipping instructor management tests - admin not authenticated", "WARN")
            return
            
        self.log("=== INSTRUCTOR MANAGEMENT TESTS ===")
        
        # Create instructor via admin
        instructor_email = f"admin_created_instructor_{datetime.now().strftime('%H%M%S')}@test.com"
        success, response = self.run_test(
            "Admin create instructor",
            "POST",
            "/admin/instructors",
            200,
            data={
                "email": instructor_email,
                "password": "AdminTest123!",
                "name": "Admin Created Instructor",
                "studio_id": self.test_studio_id
            },
            session=self.admin_session
        )
        
        if success:
            created_instructor_id = response.get('user_id')
            
            # List instructors
            self.run_test("List instructors", "GET", "/admin/instructors", 200, session=self.admin_session)
            
            # Delete instructor
            if created_instructor_id:
                self.run_test(
                    "Delete instructor",
                    "DELETE",
                    f"/admin/instructors/{created_instructor_id}",
                    200,
                    session=self.admin_session
                )

    def test_mix_management(self):
        """Test mix management (admin only)"""
        if not self.admin_authenticated:
            self.log("Skipping mix tests - admin not authenticated", "WARN")
            return
            
        self.log("=== MIX MANAGEMENT TESTS ===")
        
        # List mixes (should work for authenticated users)
        self.run_test("List mixes", "GET", "/mixes", 200, session=self.admin_session)
        
        # Test genres endpoint
        self.run_test("List genres", "GET", "/genres", 200, session=self.admin_session)
        
        # Note: File upload testing would require actual audio files
        # This is a basic structure test

    def test_playlist_management(self):
        """Test playlist CRUD operations"""
        if not self.instructor_authenticated:
            self.log("Skipping playlist tests - instructor not authenticated", "WARN")
            return
            
        self.log("=== PLAYLIST MANAGEMENT TESTS ===")
        
        # Create playlist
        success, response = self.run_test(
            "Create playlist",
            "POST",
            "/playlists",
            200,
            data={
                "name": "Test Playlist",
                "description": "A test playlist for automated testing",
                "is_public": False
            },
            session=self.instructor_session
        )
        
        if success:
            self.test_playlist_id = response.get('playlist_id')
            
            # List my playlists
            self.run_test("List my playlists", "GET", "/playlists/mine", 200, session=self.instructor_session)
            
            # List all playlists
            self.run_test("List all playlists", "GET", "/playlists", 200, session=self.instructor_session)
            
            # Get specific playlist
            if self.test_playlist_id:
                self.run_test(
                    "Get playlist",
                    "GET",
                    f"/playlists/{self.test_playlist_id}",
                    200,
                    session=self.instructor_session
                )
                
                # Update playlist
                self.run_test(
                    "Update playlist",
                    "PUT",
                    f"/playlists/{self.test_playlist_id}",
                    200,
                    data={
                        "name": "Updated Test Playlist",
                        "description": "Updated description",
                        "is_public": True
                    },
                    session=self.instructor_session
                )

    def test_auth_endpoints(self):
        """Test authentication-related endpoints"""
        self.log("=== AUTH ENDPOINTS TESTS ===")
        
        # Test /auth/me endpoint (requires authentication)
        if self.admin_authenticated:
            self.run_test("Get current user (admin)", "GET", "/auth/me", 200, session=self.admin_session)
        
        # Test logout
        self.run_test("Logout", "POST", "/auth/logout", 200, session=self.admin_session)

    def test_error_cases(self):
        """Test error handling"""
        self.log("=== ERROR HANDLING TESTS ===")
        
        # Test invalid login
        self.run_test(
            "Invalid login",
            "POST",
            "/auth/login",
            401,
            data={
                "email": "invalid@test.com",
                "password": "wrongpassword"
            }
        )
        
        # Test accessing protected endpoint without auth
        self.run_test("Unauthorized access", "GET", "/admin/instructors", 401)
        
        # Test non-existent endpoints
        self.run_test("Non-existent endpoint", "GET", "/nonexistent", 404)

    def cleanup(self):
        """Clean up test data"""
        self.log("=== CLEANUP ===")
        
        # Delete test playlist
        if self.test_playlist_id and self.instructor_authenticated:
            self.run_test(
                "Delete test playlist",
                "DELETE",
                f"/playlists/{self.test_playlist_id}",
                200,
                session=self.instructor_session
            )
        
        # Delete test studio
        if self.test_studio_id and self.admin_authenticated:
            self.run_test(
                "Delete test studio",
                "DELETE",
                f"/studios/{self.test_studio_id}",
                200,
                session=self.admin_session
            )

    def run_all_tests(self):
        """Run all test suites"""
        self.log("🚀 Starting FitBeats API Test Suite")
        self.log(f"Testing against: {self.base_url}")
        
        # Basic health checks
        self.test_health_check()
        
        # Authentication tests
        admin_auth_success = self.test_admin_auth()
        instructor_auth_success = self.test_instructor_registration_and_auth()
        
        # Admin-only features
        if admin_auth_success:
            self.test_studio_management()
            self.test_instructor_management()
            self.test_mix_management()
        
        # Instructor features
        if instructor_auth_success:
            self.test_playlist_management()
        
        # Additional auth tests
        self.test_auth_endpoints()
        
        # Error handling
        self.test_error_cases()
        
        # Cleanup
        self.cleanup()
        
        # Final report
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        self.log("=" * 50)
        self.log("🏁 TEST SUMMARY")
        self.log(f"Total tests: {self.tests_run}")
        self.log(f"Passed: {self.tests_passed}")
        self.log(f"Failed: {len(self.failed_tests)}")
        self.log(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.failed_tests:
            self.log("\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                self.log(f"  - {test['name']}")
                if 'error' in test:
                    self.log(f"    Error: {test['error']}")
                elif 'expected' in test:
                    self.log(f"    Expected: {test['expected']}, Got: {test['actual']}")
        
        return len(self.failed_tests) == 0

def main():
    """Main test runner"""
    tester = FitBeatsAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())