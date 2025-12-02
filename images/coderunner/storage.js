import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { pipeline } from "stream/promises";

export const createS3Client = () => {
  return new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_ACCESS_KEY_SECRET,
    },
  });
};

export const downloadS3Folder = async (s3Client, bucket, prefix, localPath) => {
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
  });

  const response = await s3Client.send(command);

  // we don't handle continuations here, cause the templates are not so file-heavy
  if (!response.Contents || response.IsTruncated) return;

  for (const content of response.Contents) {
    const key = content.Key;
    // Remove the prefix from the key to get the relative path
    let relativePath = key;
    if (key.startsWith(prefix)) {
      relativePath = key.substring(prefix.length);
    }

    // Remove leading slash if present
    if (relativePath.startsWith("/")) {
      relativePath = relativePath.substring(1);
    }

    if (!relativePath) continue; // Skip the folder key itself if it exists

    const filePath = path.join(localPath, relativePath);
    const dirName = path.dirname(filePath);

    await fsp.mkdir(dirName, { recursive: true });

    const getObjectCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const getObjectResponse = await s3Client.send(getObjectCommand);

    await pipeline(getObjectResponse.Body, fs.createWriteStream(filePath));
  }
};

const main = async () => {
  const s3Client = createS3Client();
  const bucketName = "";
  const templateKey = "";

  await downloadS3Folder(
    s3Client,
    bucketName,
    templateKey,
    `${process.cwd()}/code`,
  );

  console.log("Done");
};
