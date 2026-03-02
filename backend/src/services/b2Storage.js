const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const logger = require('../utils/logger');

const s3Client = new S3Client({
  region: process.env.B2_REGION,
  endpoint: process.env.B2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
  },
});

const BUCKET_NAME = process.env.B2_BUCKET_NAME || 'doc-drive-storage';
const SIGNED_URL_EXPIRY = 5 * 60; // 5 minutes

/**
 * Builds the storage key for a file
 * Format: userId/folderId_or_root/fileId_originalName
 */
const buildStorageKey = (userId, folderId, fileId, originalName) => {
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const folderPart = folderId || 'root';
  return `${userId}/${folderPart}/${fileId}_${sanitizedName}`;
};

/**
 * Uploads a file buffer to Backblaze B2
 * @param {string} key - storage key
 * @param {Buffer} buffer - file buffer
 * @param {string} contentType - MIME type
 * @returns {Promise<void>}
 */
const uploadFile = async (key, buffer, contentType) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  await s3Client.send(command);
  logger.info(`Uploaded file to B2: ${key}`);
};

/**
 * Generates a temporary signed URL for downloading a file from B2
 * @param {string} key - storage key
 * @param {number} [expiresIn=300] - expiry in seconds
 * @returns {Promise<string>} signed URL
 */
const getSignedDownloadUrl = async (key, expiresIn = SIGNED_URL_EXPIRY) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
};

/**
 * Deletes a file from Backblaze B2
 * @param {string} key - storage key
 * @returns {Promise<void>}
 */
const deleteFile = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  await s3Client.send(command);
  logger.info(`Deleted file from B2: ${key}`);
};

/**
 * Checks if a file exists in Backblaze B2
 * @param {string} key - storage key
 * @returns {Promise<boolean>}
 */
const fileExists = async (key) => {
  try {
    const command = new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    await s3Client.send(command);
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  uploadFile,
  getSignedDownloadUrl,
  deleteFile,
  fileExists,
  buildStorageKey,
};
