const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
const pptxgen = require('pptxgenjs');

const repoRoot = path.resolve(__dirname, '..');
const outputPath = path.join(repoRoot, 'downloads', 'Mihir_Trivedi_HSN_OR_Dashboard.pptx');
const dashboardUrl = 'https://mtrivedilu.github.io/HSN/dashboard/';
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json', '.pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation' };

function startServer() {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const requestPath = pathname === '/' ? '/index.html' : pathname.endsWith('/') ? `${pathname}index.html` : pathname;
    const filePath = path.resolve(repoRoot, `.${requestPath}`);
    if (!filePath.startsWith(`${repoRoot}${path.sep}`)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    fs.readFile(filePath, (error, content) => {
      if (error) {
        response.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Not found');
        return;
      }
      response.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream' });
      response.end(content);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function main() {
  const server = await startServer();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hsn-pptx-'));
  let browser;
  try {
    const { port } = server.address();
    browser = await chromium.launch({ headless:true });
    const page = await browser.newPage({ viewport:{ width:1920, height:1080 }, deviceScaleFactor:1 });
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil:'networkidle' });
    await page.addStyleTag({ content:`
      .site-header,.deck-controls{display:none!important}
      html,body,.deck{width:1920px!important;height:1080px!important;margin:0!important;overflow:hidden!important}
      .slide{position:absolute!important;inset:0!important;width:1920px!important;height:1080px!important;transform:none!important}
    ` });
    await page.evaluate(() => document.fonts.ready);

    const slideCount = await page.locator('.slide').count();
    const images = [];
    let ctaBox;
    let ctaImagePath;
    for (let index = 0; index < slideCount; index += 1) {
      await page.evaluate((slideIndex) => { location.hash = document.querySelectorAll('.slide')[slideIndex].id; }, index);
      await page.waitForTimeout(1200);
      const imagePath = path.join(tempDir, `slide-${index + 1}.png`);
      await page.locator('.slide.is-active').screenshot({ path:imagePath });
      images.push(imagePath);
      if (index === slideCount - 1) {
        const cta = page.getByRole('link', { name:/Explore Interactive OR Dashboard/i });
        ctaBox = await cta.boundingBox();
        ctaImagePath = path.join(tempDir, 'dashboard-cta.png');
        await cta.screenshot({ path:ctaImagePath });
      }
    }

    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = 'Mihir Trivedi';
    pptx.subject = 'HSN Decision Support Analyst II interview presentation';
    pptx.title = 'HSN Operating Room Dashboard';
    pptx.company = 'Portfolio presentation';
    pptx.lang = 'en-CA';
    images.forEach((imagePath, index) => {
      const slide = pptx.addSlide();
      slide.background = { color:'F7F6F2' };
      slide.addImage({ path:imagePath, x:0, y:0, w:13.333333, h:7.5 });
      if (index === images.length - 1 && ctaBox) {
        const scaleX = 13.333333 / 1920;
        const scaleY = 7.5 / 1080;
        // Re-add the exact CTA pixels as a linked image. A visible image hyperlink
        // is reliably clickable in PowerPoint, unlike a fully transparent overlay.
        slide.addImage({
          path:ctaImagePath,
          x:ctaBox.x * scaleX,
          y:ctaBox.y * scaleY,
          w:ctaBox.width * scaleX,
          h:ctaBox.height * scaleY,
          hyperlink:{ url:dashboardUrl, tooltip:'Explore Interactive OR Dashboard' },
          altText:'Explore Interactive OR Dashboard'
        });
      }
    });
    await pptx.writeFile({ fileName:outputPath });
    console.log(`Generated ${slideCount} slides at ${outputPath}`);
    console.log(`Embedded dashboard hyperlink: ${dashboardUrl}`);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(tempDir, { recursive:true, force:true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
