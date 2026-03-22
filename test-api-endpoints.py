import requests
import json

# First, get a JWT token by logging in as guest
session = requests.Session()

# Step 1: Call guest login to get redirected to callback
login_url = "http://localhost:50110/todo-for-ai/api/v1/auth/login/guest?return_to=/todo-for-ai/pages"
response = session.get(login_url, allow_redirects=True)

# Extract access_token from URL
if 'access_token' in response.url:
    from urllib.parse import parse_qs, urlparse
    parsed = urlparse(response.url)
    params = parse_qs(parsed.query)
    access_token = params.get('access_token', [None])[0]
    print(f"Got access token: {access_token[:50]}...")
else:
    print(f"No access token in URL: {response.url}")
    exit(1)

# Step 2: Call dashboard/stats with the JWT token
stats_url = "http://localhost:50110/todo-for-ai/api/v1/dashboard/stats"
headers = {"Authorization": f"Bearer {access_token}"}

print(f"\nCalling {stats_url}")
try:
    response = requests.get(stats_url, headers=headers, timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:500]}")
except Exception as e:
    print(f"Error: {e}")

# Step 3: Call other endpoints to verify they work
endpoints = [
    "/todo-for-ai/api/v1/auth/me",
    "/todo-for-ai/api/v1/projects",
    "/todo-for-ai/api/v1/pins",
    "/todo-for-ai/api/v1/organizations",
    "/todo-for-ai/api/v1/dashboard/activity-heatmap",
]

print("\n\nTesting other endpoints:")
for endpoint in endpoints:
    url = f"http://localhost:50110{endpoint}"
    try:
        response = requests.get(url, headers=headers, timeout=10)
        print(f"  [{response.status_code}] {endpoint}")
    except Exception as e:
        print(f"  [ERROR] {endpoint}: {e}")
