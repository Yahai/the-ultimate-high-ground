"""End-to-end browser test for Operation First Light (actual app, not a CSS mock)."""
from pathlib import Path
from threading import Thread
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import os, shutil
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

os.chdir(ROOT)
server=ThreadingHTTPServer(('127.0.0.1',0),QuietHandler)
Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_address[1]}/'
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=[
            '--no-sandbox','--disable-dev-shm-usage','--enable-webgl',
            '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        page=browser.new_page(viewport={'width':1450,'height':920},device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url,wait_until='domcontentloaded',timeout=30000)
        expect(page.locator('.splash')).to_be_visible(timeout=40000)
        page.locator('.enter-btn').click()
        guide=page.locator('.firstlight-guide')
        expect(guide).to_be_visible(timeout=25000)
        expect(guide.get_by_text('Protect the Delta')).to_be_visible()
        guide.locator('button.primary').click()
        expect(guide.get_by_text('Assess the Niger Delta')).to_be_visible()
        guide.locator('button.primary').click()
        expect(guide.locator('[role=progressbar]')).to_have_attribute('aria-valuenow','1')
        expect(guide.get_by_text('Acquire partner imagery')).to_be_visible()
        guide.locator('button.primary').click()
        page.locator('.command-actions button').filter(has_text='Analyse partner imagery').click()
        expect(guide.locator('[role=progressbar]')).to_have_attribute('aria-valuenow','2')
        guide.locator('button.primary').click()
        page.locator('.command-actions button').filter(has_text='Fund resilience package').click()
        expect(guide.locator('[role=progressbar]')).to_have_attribute('aria-valuenow','3')
        guide.locator('button.primary').click()
        event=page.get_by_role('dialog',name='Strategic event decision')
        expect(event).to_be_visible(timeout=15000)
        event.get_by_role('button',name='Purchase rapid-response partner imagery').click()
        expect(page.get_by_role('dialog',name='First Light mission debrief')).to_be_visible(timeout=15000)
        expect(page.get_by_text('OPERATION EXCELLENT')).to_be_visible()
        saved=page.evaluate('JSON.parse(localStorage.getItem("tuhg-campaign-v4"))')
        assert saved and saved['firstLight']['score']==3, 'First Light result not persisted'
        assert saved['turn']==2, saved['turn']
        assert not errors, f'JavaScript errors: {errors[:4]}'
        print('PASS: full First Light mission, decisions, debrief, saved progress')
        page.get_by_role('button',name='CONTINUE CAMPAIGN').click()
        page.reload(wait_until='domcontentloaded')
        page.locator('.enter-btn').click(timeout=30000)
        expect(page.locator('.firstlight-reopen')).to_be_visible(timeout=30000)
        page.locator('.firstlight-reopen').click()
        expect(page.get_by_text('OPERATION EXCELLENT')).to_be_visible()
        print('PASS: reload retains completed First Light debrief')
        page.close()
        context=browser.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True,device_scale_factor=2)
        phone=context.new_page()
        phone.goto(url,wait_until='domcontentloaded',timeout=30000)
        expect(phone.locator('.splash')).to_be_visible(timeout=40000)
        phone.locator('.enter-btn').click()
        expect(phone.locator('.mobile-bottom-nav')).to_be_visible(timeout=30000)
        expect(phone.locator('.firstlight-guide')).to_be_visible()
        assert phone.locator('.firstlight-guide').bounding_box()['width'] < 844*.55
        print('PASS: landscape phone full app, compact First Light guidance')
        context.close();browser.close()
finally:
    server.shutdown();server.server_close()
