const CryptoJS = require('crypto-js');

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET;

if (!ENCRYPTION_SECRET || ENCRYPTION_SECRET.length < 32) {
  throw new Error('ENCRYPTION_SECRET must be at least 32 characters');
}

/**
 * Encrypts a face embedding array to a Base64 string
 * @param {number[]} embedding - 128D face embedding vector
 * @returns {string} AES-256 encrypted Base64 string
 */
const encryptEmbedding = (embedding) => {
  const embeddingJson = JSON.stringify(embedding);
  const encrypted = CryptoJS.AES.encrypt(embeddingJson, ENCRYPTION_SECRET).toString();
  return encrypted;
};

/**
 * Decrypts a stored embedding string back to a float array
 * @param {string} encryptedEmbedding - Encrypted embedding string
 * @returns {number[]} Decrypted 128D embedding vector
 */
const decryptEmbedding = (encryptedEmbedding) => {
  const bytes = CryptoJS.AES.decrypt(encryptedEmbedding, ENCRYPTION_SECRET);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  return JSON.parse(decrypted);
};

/**
 * Computes cosine similarity between two vectors
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number} Similarity score between -1 and 1
 */
const cosineSimilarity = (vecA, vecB) => {
  if (vecA.length !== vecB.length) throw new Error('Vectors must be same length');
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
};

const FACE_MATCH_THRESHOLD = 0.6;

module.exports = {
  encryptEmbedding,
  decryptEmbedding,
  cosineSimilarity,
  FACE_MATCH_THRESHOLD,
};
