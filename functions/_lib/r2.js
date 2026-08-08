// bit cafe admin: talk to the R2 bucket two different ways.
//
// - putObject/deleteObjects/bucketUsage go through the native R2
//   binding (env.MEDIA_BUCKET) -- fast, free, no credentials needed,
//   used for posters (small) and for delete/list.
// - presignPutUrl signs a one-shot S3-API PUT URL so the *browser* can
//   upload a movie file directly to R2, bypassing this Function's own
//   request body entirely. Cloudflare's Free plan caps a Function's
//   own request at 100MB, which a real movie file blows past -- see
//   https://developers.cloudflare.com/r2/examples/aws/aws4fetch/.
//   This is the only thing here that needs the R2 API token
//   (R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY), since presigning is an
//   S3-API-only capability the binding doesn't expose.

import { AwsClient } from "aws4fetch";

export async function presignPutUrl(env, key, { expiresInSeconds = 3600 } = {}) {
  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });
  const url = new URL(
    `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${key}`
  );
  url.searchParams.set("X-Amz-Expires", String(expiresInSeconds));
  const signed = await client.sign(url.toString(), {
    method: "PUT",
    aws: { signQuery: true },
  });
  return signed.url;
}

export function publicUrlFor(env, key) {
  return `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
}

export async function putObject(bucket, key, body, contentType) {
  await bucket.put(key, body, { httpMetadata: { contentType } });
}

export async function deleteObjects(bucket, keys) {
  await Promise.all(
    (keys || []).filter(Boolean).map((key) => bucket.delete(key))
  );
}

// walks the whole bucket listing to report real usage against the
// free-tier cap -- deliberately the source of truth for the storage
// meter instead of summing the movies table's `bytes` column, so an
// object that's in the bucket but not tracked by a row (a failed
// upload, a stray file) still counts.
export async function bucketUsage(bucket) {
  let cursor;
  let bytes = 0;
  let count = 0;
  do {
    const page = await bucket.list({ cursor });
    for (const obj of page.objects) {
      bytes += obj.size;
      count++;
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return { bytes, count };
}
