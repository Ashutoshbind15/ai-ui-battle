import { createS3Client, downloadS3Folder } from "./storage.js";

const CODE_DIR = "/code";
const preDefinedTemplates = ["react-ts-vite-tailwind-v4"];

const resolveTemplateKey = (template) => {
  if (!preDefinedTemplates.includes(template)) {
    throw new Error(`Template ${template} not found`);
  }
  return template;
};

const downloadTemplate = async (templateKey) => {
  const bucketName = process.env.S3_BUCKET_NAME;
  const s3Client = createS3Client();
  await downloadS3Folder(s3Client, bucketName, templateKey, CODE_DIR);
  console.log(`Template ${templateKey} downloaded to ${CODE_DIR}`);
};

export const setup = async (template) => {
  const templateKey = resolveTemplateKey(template);
  await downloadTemplate(templateKey);
};
