import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// The site's first server-side route — everything else stays static and
// free. See DECISIONS.md.
export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 5000;

// Strips characters that could inject extra headers or corrupt the ones
// we build (subject, Reply-To). Never applied to the message body, which
// only ever lands in the email's text content.
function sanitiseHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid request body.' }, 400);
  }

  // Honeypot: a field real visitors never see or fill in. If it has any
  // value, this is a bot — return a success response without sending
  // anything. Silent discard beats an error a bot can learn from.
  //
  // TODO(turnstile): once the Turnstile Spin flow is wired up, verify a
  // `token` field here (siteverify call to Cloudflare) before proceeding,
  // and reject with 400 on failure.
  const honeypot = typeof payload.website === 'string' ? payload.website.trim() : '';
  if (honeypot) {
    return jsonResponse({ ok: true }, 200);
  }

  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';

  if (!name) {
    return jsonResponse({ ok: false, error: 'Please enter your name.' }, 400);
  }
  if (!EMAIL_RE.test(email)) {
    return jsonResponse({ ok: false, error: 'Please enter a valid email address.' }, 400);
  }
  if (!message) {
    return jsonResponse({ ok: false, error: 'Please enter a message.' }, 400);
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return jsonResponse(
      { ok: false, error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).` },
      400
    );
  }

  const safeName = sanitiseHeaderValue(name);
  const safeEmail = sanitiseHeaderValue(email);

  try {
    await env.EMAIL.send({
      from: { name: 'laurencetimms.com', email: 'contact@laurencetimms.com' },
      to: 'laurence.timms@gmail.com',
      replyTo: safeEmail,
      subject: `Website enquiry from ${safeName}`,
      text: `${message}\n\n—\n${safeName} <${safeEmail}>`,
    });
  } catch {
    // Never leak internal error detail to the client.
    return jsonResponse(
      { ok: false, error: 'Something went wrong sending your message. Please try again.' },
      500
    );
  }

  return jsonResponse({ ok: true }, 200);
};

// Anything other than POST gets an explicit 405, not the 404 Astro would
// return by default for an unhandled method.
export const ALL: APIRoute = () => {
  return new Response(JSON.stringify({ ok: false, error: 'Method not allowed.' }), {
    status: 405,
    headers: { 'content-type': 'application/json', allow: 'POST' },
  });
};
