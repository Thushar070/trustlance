import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3ClientInstance: S3Client | null = null;

function getS3Client(): S3Client {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!s3ClientInstance) {
    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error("AWS credentials/region are not configured in environment variables.");
    }
    s3ClientInstance = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return s3ClientInstance;
}

/**
 * Generates a presigned PUT upload URL and the final S3 file URL.
 */
export async function generatePresignedUploadUrl(fileName: string, contentType: string) {
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  if (!bucketName || !region) {
    throw new Error("AWS S3 bucket name or region is not configured in environment variables.");
  }

  const s3Client = getS3Client();
  const key = `submissions/${Date.now()}_${fileName}`;
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  // presigned URL is valid for 1 hour (3600 seconds)
  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return {
    uploadUrl: signedUrl,
    fileUrl: `https://${bucketName}.s3.${region}.amazonaws.com/${key}`,
  };
}
