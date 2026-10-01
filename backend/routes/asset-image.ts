import { checkOrigin, member } from '../auth/sessions';
import { ApiError, allow } from '../services/asset-service';
import { ASSET_IMAGE_MAX_BYTES, deleteAssetImage, getAssetImage, saveAssetImage } from '../services/asset-images';
import { fail } from './data';

const privateHeaders = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };

// Limit the actual stream even when Content-Length is absent or inaccurate.
async function boundedBody(request: Request, maxBytes: number) {
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new ApiError('ขนาดคำขอเกินกำหนด รูปภาพต้องไม่เกิน 4 MB', 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}

function failure(error: unknown) {
  const response = fail(error);
  for (const [name, value] of Object.entries(privateHeaders)) response.headers.set(name, value);
  return response;
}

export async function GET(request: Request) {
  try {
    await member(request);
    const image = await getAssetImage(new URL(request.url).searchParams.get('asset'));
    return new Response(image.body as unknown as BodyInit, { headers: { ...privateHeaders, 'Content-Type': 'image/webp' } });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await member(request);
    allow(user, ['staff', 'admin']);
    if (!request.headers.get('content-type')?.includes('multipart/form-data')) throw new ApiError('กรุณาส่งรูปภาพในรูปแบบ multipart/form-data');
    const maxBodyBytes = ASSET_IMAGE_MAX_BYTES + 256 * 1024;
    if (Number(request.headers.get('content-length')) > maxBodyBytes) throw new ApiError('รูปภาพต้องไม่เกิน 4 MB', 413);
    const body = await boundedBody(request, maxBodyBytes);
    let form: FormData;
    try { form = await new Request(request.url, { method: 'POST', headers: request.headers, body }).formData(); }
    catch { throw new ApiError('รูปแบบคำขอไม่ถูกต้อง'); }
    return Response.json(await saveAssetImage(user, form), { headers: privateHeaders });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const user = await member(request);
    allow(user, ['staff', 'admin']);
    if (Number(request.headers.get('content-length')) > 4096) throw new ApiError('รูปแบบคำขอไม่ถูกต้อง', 413);
    const body = await boundedBody(request, 4096);
    return Response.json(await deleteAssetImage(user, JSON.parse(new TextDecoder().decode(body))), { headers: privateHeaders });
  } catch (error) { return failure(error); }
}
