export type CreateUploadSessionResp = {
  endpoint: string;      // http://localhost:5000/api/uploads
  uploadToken: string;   // jwt-ish token riêng cho upload
  chunkSize: number;     // 5242880
  maxSize: number;       // 104857600
};

export type VerifyUploadResp =
  | { ok: false }
  | {
      ok: true;
      fileId: string;
      bucket: string;
      objectKey: string;
      size: number;
      mime: string;
      etag?: string;
    };

export type PresignResp =
  | { ok: false }
  | { ok: true; url: string };