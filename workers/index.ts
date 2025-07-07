import puppeteer from "@cloudflare/puppeteer";
import * as cheerio from "cheerio";

interface URLQueueMessage {
	type: 'url';
	url: string;
	attempt: number;
	maxRetries: number;
}
interface URLPuppeteerQueueMessage {
	type: 'url:puppeteer';
	url: string;
}
interface IMAGEQueueMessage {
	type: 'image';
	url: string;
	slug: string;
	attempt: number;
	maxRetries: number;
}

export default {
	async fetch(req, env, ctx): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
		switch (true) {
			case req.method === 'GET' && path.endsWith('/queue'):
				return handleGetQueue(req, env);
			case req.method === 'GET' && path.endsWith('/queue-image'):
				return handleGetImageQueue(req, env);
			case req.method === 'GET' && path.endsWith('/'):
				return new Response("Hello from the queue endpoint");
			default:
				return new Response('Not found', { status: 404 });
		}
	},
	async queue(batch, env): Promise<void> {
		for (let message of batch.messages) {
			if (message.body.type === 'image') {
				// Handle image processing
				await processImage(message.body, env);
			} else if (message.body.type === 'url') {
				await processURL(message.body, env);
			} else if (message.body.type === 'url:puppeteer') {
				await processPuppeteerURL(message.body, env);
			}
		}
	},
} satisfies ExportedHandler<Env, URLQueueMessage | IMAGEQueueMessage | URLPuppeteerQueueMessage>;

async function handleGetQueue(
	req: Request,
	env: Env
): Promise<Response> {
	// This is a simple example of how to get the queue name from the request
	const url = new URL(req.url);
	const targetUrl = url.searchParams.get('url');
	if (!targetUrl) {
		return new Response('Missing URL parameter', { status: 400 });
	}
	await env.CRALWER_QUEUE.send({
		type: 'url',
		url: targetUrl,
		attempt: 0,
		maxRetries: 3,
	});
	return new Response('Message sent to the queue', { status: 200 });
}

async function handleGetImageQueue(
	req: Request,
	env: Env
): Promise<Response> {
	const url = new URL(req.url);
	const targetSlug = url.searchParams.get('slug');
	const targetUrl = url.searchParams.get('url');
	if (!targetUrl) {
		return new Response('Missing URL parameter', { status: 400 });
	}
	await env.CRALWER_QUEUE.send({
		type: 'image',
		slug: targetSlug,
		url: targetUrl,
		attempt: 0,
		maxRetries: 3,
	});
	return new Response('Image message sent to the queue', { status: 200 });
}

async function processURL(message: URLQueueMessage, env: Env) {
	const { url, attempt, maxRetries } = message;
	console.log(url, attempt, maxRetries);
	try {
		const customHeaders = new Headers();
  	customHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
		const response = await fetch(url, {
			signal: AbortSignal.timeout(15000), // Timeout per attempt
			headers: {
				"Cache-Control": "no-cache",
				...customHeaders
			}
		});
		console.info(`Attempt ${attempt} for ${url}:`, response.status);
		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
		}

		const html = await response.text();
		const $ = cheerio.load(html);
		let title = $("head > title").text().trim();
    if (title?.includes("Vercel Security Checkpoint")) {
      title = "";
      throw new Error("Vercel Security Checkpoint");
    }
		const value = title;
		const description = $("meta[name='description']").attr("content")?.trim() ?? "";

		const result = {
			url: url,
			value: value,
			description: description,
		};
		console.log("Result:", result);
		await env.NEWSLETTER_CRAWL.put(`url:${url}`, JSON.stringify(result));

		return;

	} catch (error) {
		console.error(`Attempt ${attempt} failed for ${url}:`, error instanceof Error ? error.message : error);
		if (attempt < maxRetries) {
			// Retry the message
			await env.CRALWER_QUEUE.send({
				type: 'url',
				url: url,
				attempt: attempt + 1,
				maxRetries: maxRetries,
			}, {
        delaySeconds: 2,
      });
		} else {
			await env.CRALWER_QUEUE.send({
				type: 'url:puppeteer',
				url: url,
			});
    }
	}
}

async function processPuppeteerURL(message: URLPuppeteerQueueMessage, env: Env) {
  const { url } = message;
  const browser = await puppeteer.launch(env.MYBROWSER);
  const page = await browser.newPage();
  await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout: 15000,
  })
  let title = await page.title();
  if (title?.includes("Vercel Security Checkpoint")) {
    title = "";
    console.warn(`Vercel Security Checkpoint for ${url}`);
  }
  let description = '';
  try {
	  description = await page.$eval("meta[name='description']", element => element.getAttribute('content') || '');
  } catch (e) {
	  console.warn(`Could not find description meta tag for ${url}`);
  }

  const result = {
    url: url,
    value: title || new URL(url).host,
    description: description.trim(),
  };
  console.log("Puppeteer Result:", result);
  await env.NEWSLETTER_CRAWL.put(`url:${url}`, JSON.stringify(result), {
    expirationTtl: 60 * 60 * 24 * 14, // 14 days
  });

  await browser.close();
}

async function processImage(message: IMAGEQueueMessage, env: Env) {
	const { slug, url, attempt, maxRetries } = message;
	const image = await env.IMAGES.head(`thumbnail/${slug}`);
  if (
    !image ||
    !image.httpMetadata?.contentType?.includes("image") ||
    !(image.uploaded instanceof Date)
  ) {
		try {
      const imageResponse = await fetch(url);
			console.info(`Attempt ${attempt} for ${url}:`, imageResponse.status);
      if (!imageResponse.headers.get("content-type")?.includes("image")) {
        await new Promise((resolve) => {
          setTimeout(resolve, 10000);
        });
      }
      const imageBuffer = await imageResponse.arrayBuffer();
      await env.IMAGES.put(`thumbnail/${slug}`, imageBuffer, {
        httpMetadata: {
          contentType: imageResponse.headers.get("content-type") ?? "application/octet-stream",
        },
      });
    } catch (error) {
			console.error(`Attempt ${attempt} failed for ${url}:`, error instanceof Error ? error.message : error);
			if (attempt < maxRetries) {
				// Retry the message
				await env.CRALWER_QUEUE.send({
					type: 'image',
					url: url,
					slug: slug,
					attempt: attempt + 1,
					maxRetries: maxRetries,
				}, {
          delaySeconds: 2,
        });
			}
		}
  }
}
