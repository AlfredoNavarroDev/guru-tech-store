import { Injectable, Logger } from '@nestjs/common';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generateFromHtml(html: string): Promise<Buffer> {
    // @sparticuz/chromium ships a Linux ELF binary — won't run on macOS natively.
    // Fall back to system Chrome on macOS or a custom path via env var.
    const isMac = process.platform === 'darwin';
    const executablePath =
      process.env.CHROMIUM_EXECUTABLE_PATH ??
      (isMac
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : await chromium.executablePath());
    const args = isMac
      ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      : [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ];
    const headless = isMac ? true : chromium.headless;

    const browser = await puppeteer.launch({ args, executablePath, headless });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true });
      return Buffer.from(pdf);
    } finally {
      try {
        await browser.close();
      } catch (err) {
        this.logger.error('Failed to close Puppeteer browser', err);
      }
    }
  }
}
