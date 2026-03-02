#!/bin/bash
# Downloads required face-api.js model files to frontend/public/models
# Run from the project root: bash download-models.sh

set -e

MODELS_DIR="frontend/public/models"
BASE_URL="https://raw.githubusercontent.com/vladmandic/face-api/master/model"

mkdir -p "$MODELS_DIR"
cd "$MODELS_DIR"

echo "Downloading face-api.js models..."

FILES=(
  "ssd_mobilenetv1_model-weights_manifest.json"
  "ssd_mobilenetv1_model-shard1"
  "face_landmark_68_model-weights_manifest.json"
  "face_landmark_68_model-shard1"
  "face_recognition_model-weights_manifest.json"
  "face_recognition_model-shard1"
  "face_recognition_model-shard2"
  "tiny_face_detector_model-weights_manifest.json"
  "tiny_face_detector_model-shard1"
)

for FILE in "${FILES[@]}"; do
  echo "  Downloading $FILE..."
  curl -sO "$BASE_URL/$FILE" || echo "  Warning: Failed to download $FILE"
done

cd - > /dev/null
echo "Models downloaded to $MODELS_DIR"
echo "Done!"
