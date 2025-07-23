#!/bin/bash

# Test customer API endpoints
echo "Testing Customer Management System"
echo "================================="

# Base URL
BASE_URL="http://localhost:5002/api"

# Get auth token (you'll need to replace with actual login)
TOKEN="YOUR_AUTH_TOKEN"

# Test 1: Create a customer
echo -e "\n1. Creating a new customer..."
curl -X POST "$BASE_URL/customers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Code: default" \
  -d '{
    "name": "Test Customer",
    "phone": "9876543210",
    "email": "test@example.com",
    "address": "123 Test Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "customer_type": "regular"
  }' | jq .

# Test 2: Get customers list
echo -e "\n2. Getting customers list..."
curl -X GET "$BASE_URL/customers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Code: default" | jq .

# Test 3: Get customer by ID (replace with actual ID)
CUSTOMER_ID="REPLACE_WITH_ACTUAL_ID"
echo -e "\n3. Getting customer details..."
curl -X GET "$BASE_URL/customers/$CUSTOMER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Code: default" | jq .