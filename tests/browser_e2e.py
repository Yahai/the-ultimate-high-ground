"""End-to-end playable First Light smoke test: run under GitHub Actions Playwright.
It launches a local static server and loads the actual React/Three.js application.
No external military data is queried, only public CDN scripts used by the game.
"""
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
thread=Thread(target=server.serve_forever,daemon=True)
thread.start()
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
        expect(page.get_by_text('DOMINATE THE FINAL FRONTIER').first).to_be_visible()
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
        saved=page.evaluate('JSON.parse(localStorage.getItem("tuhg-campaign-v5"))')
        assert saved and saved['firstLight']['score']==3, 'First Light result not persisted'
        assert saved['turn']==2, saved['turn']
        assert not errors, f'Page JavaScript exceptions: {errors[:4]}'
        print('PASS browser: full First Light scenario, decisions, debrief, persisted save')
        page.get_by_role('button',name='CONTINUE CAMPAIGN').click()
        # A real project investment must update the campaign, consume funds and persist.
        portfolio=page.locator('#project-portfolio')
        expect(portfolio).to_be_attached()
        budget_before=page.evaluate('JSON.parse(localStorage.getItem("tuhg-campaign-v5")).budget')
        portfolio.get_by_role('button',name='Fund Emergency Data Exchange').click()
        data=page.evaluate('JSON.parse(localStorage.getItem("tuhg-campaign-v5"))')
        assert data['projects']['exchange']['status']=='active', data.get('projects')
        assert abs(data['budget']-(budget_before-160))<.01, (data['budget'],budget_before)
        print('PASS browser: v0.8 project investment and budget persistence')
        page.reload(wait_until='domcontentloaded')
        page.locator('.enter-btn').click(timeout=30000)
        expect(page.locator('.firstlight-reopen')).to_be_visible(timeout=30000)
        page.locator('.firstlight-reopen').click()
        expect(page.get_by_text('OPERATION EXCELLENT')).to_be_visible()
        print('PASS browser: reload keeps completed debrief')
        page.close()
        # Landscape phone checks the actual 3D game, not just isolated CSS.
        context=browser.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True,device_scale_factor=2)
        phone=context.new_page()
        phone.goto(url,wait_until='domcontentloaded',timeout=30000)
        expect(phone.locator('.splash')).to_be_visible(timeout=40000)
        phone.locator('.enter-btn').click()
        expect(phone.locator('.mobile-bottom-nav')).to_be_visible(timeout=30000)
        expect(phone.locator('.firstlight-guide')).to_be_visible()
        assert phone.locator('.firstlight-guide').bounding_box()['width'] < 844*.55
        print('PASS browser: landscape phone boot, touch navigation and compact First Light guidance')
        context.close();browser.close()
finally:
    server.shutdown();server.server_close()