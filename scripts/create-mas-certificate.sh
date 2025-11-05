#!/bin/bash
# Script to create Certificate Signing Request for Mac App Distribution certificate
# This is needed for Mac App Store distribution

echo "Creating Certificate Signing Request (CSR) for Mac App Distribution..."
echo ""

# Get user email (from git config or prompt)
EMAIL=$(git config user.email 2>/dev/null)
if [ -z "$EMAIL" ]; then
  read -p "Enter your email address: " EMAIL
fi

# Get common name
read -p "Enter your name or organization [Roman Kurnovskii]: " CN
CN=${CN:-"Roman Kurnovskii"}

# Generate CSR
echo ""
echo "Generating CSR file..."
openssl req -new -newkey rsa:2048 -nodes \
  -keyout CertificateSigningRequest.key \
  -out CertificateSigningRequest.certSigningRequest \
  -subj "/CN=$CN/emailAddress=$EMAIL/O=$CN/C=US"

if [ $? -eq 0 ]; then
  echo ""
  echo "✓ CSR file created: CertificateSigningRequest.certSigningRequest"
  echo ""
  echo "Next steps:"
  echo "1. Go to: https://developer.apple.com/account/resources/certificates/add"
  echo "2. Select 'Mac App Distribution'"
  echo "3. Upload the file: CertificateSigningRequest.certSigningRequest"
  echo "4. Download and install the certificate"
  echo ""
  echo "⚠️  Keep CertificateSigningRequest.key safe - you'll need it later!"
else
  echo ""
  echo "✗ Failed to generate CSR"
  exit 1
fi

