#!/bin/bash
# Prepare build by copying necessary files from root node_modules
cd "$(dirname "$0")/.."
mkdir -p node_modules/@react-native
cp -r ../../node_modules/@react-native/gradle-plugin node_modules/@react-native/ 2>/dev/null || true
cp -r ../../node_modules/react-native/ReactAndroid node_modules/react-native/ 2>/dev/null || true
echo "Build preparation complete"
